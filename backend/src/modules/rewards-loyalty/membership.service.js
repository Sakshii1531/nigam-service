import { Membership } from './membership.model.js';
import { UserMembership } from './userMembership.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../payments-wallet/paymentGateway.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';

const MEMBERSHIP_DURATION_MONTHS = 12;

export async function listPlans() {
  return Membership.find().sort({ tierRank: 1 });
}

/** The customer's membership, or null. Expiry is evaluated on read so a lapsed
 * membership stops being reported as active without needing a cron sweep. */
export async function getActiveMembership(userId) {
  const membership = await UserMembership.findOne({ user: userId, status: 'Active' }).populate('membership');
  if (!membership) return null;

  if (membership.expiresAt <= new Date()) {
    membership.status = 'Expired';
    await membership.save();
    return null;
  }
  return membership;
}

/**
 * Starts a membership purchase. The price comes from the catalogue, and the
 * membership stays 'Pending Payment' until the gateway signature verifies —
 * the app used to send a customer to a success screen having charged nothing
 * and recorded nothing.
 */
export async function purchaseMembership(userId, { planId, paymentMethod = 'UPI' }) {
  const plan = await Membership.findById(planId);
  if (!plan) throw new ApiError(404, 'Membership plan not found');

  const existing = await getActiveMembership(userId);
  if (existing) {
    throw new ApiError(409, `You already hold an active ${existing.membership.name} membership`);
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + MEMBERSHIP_DURATION_MONTHS);

  const userMembership = await UserMembership.create({
    user: userId,
    membership: plan._id,
    pricePaid: plan.price,
    expiresAt,
    status: plan.price > 0 ? 'Pending Payment' : 'Active',
  });

  if (plan.price <= 0) {
    return { membership: await userMembership.populate('membership'), razorpay: null };
  }

  const gatewayOrder = await createRazorpayOrder({
    amount: plan.price,
    receipt: `membership_${userMembership.id}`,
    notes: { membershipId: userMembership.id },
  });

  await Payment.create({
    user: userId,
    targetType: 'membership',
    targetId: userMembership._id,
    amount: plan.price,
    method: paymentMethod,
    status: 'Pending',
    gatewayRef: gatewayOrder.id,
  });

  return {
    membership: await userMembership.populate('membership'),
    razorpay: {
      orderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      keyId: env.razorpay.keyId,
    },
  };
}

/** Same server-side order-id lookup as the order/booking/job verify paths. */
export async function verifyMembershipPayment(userId, membershipId, { razorpayPaymentId, razorpaySignature }) {
  const userMembership = await UserMembership.findById(membershipId);
  if (!userMembership) throw new ApiError(404, 'Membership not found');
  if (String(userMembership.user) !== String(userId)) throw new ApiError(403, 'Not authorized to pay for this membership');

  const pendingPayment = await Payment.findOne({ targetType: 'membership', targetId: userMembership._id, status: 'Pending' });
  if (!pendingPayment) throw new ApiError(400, 'No pending payment found for this membership');

  const valid = verifyRazorpaySignature({
    orderId: pendingPayment.gatewayRef,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) throw new ApiError(400, 'Payment signature verification failed');

  pendingPayment.status = 'Success';
  pendingPayment.razorpayPaymentId = razorpayPaymentId;
  await pendingPayment.save();

  userMembership.status = 'Active';
  userMembership.startedAt = new Date();
  await userMembership.save();

  return { membership: await userMembership.populate('membership'), payment: pendingPayment };
}
