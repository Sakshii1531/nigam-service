import { Payment } from './payment.model.js';
import { findCapturedPayment, verifyCapturedPayment, paymentMethodFromGateway } from './paymentGateway.js';
import { settleBookingAdvance } from '../booking/booking.service.js';
import { settleOrderPayment } from '../buy-commerce/order.service.js';
import { settleJobPayment } from '../service-provider/job.service.js';
import { reconcileProtectionPayment } from '../warranty-amc-exchange/protectionCheckout.service.js';

/**
 * Safety net for "the customer paid but our app never heard about it".
 *
 * Every purchase here is a two-step: we create a Razorpay order, the customer
 * pays in Razorpay's window, and only then does their BROWSER call us to say so.
 * If the tab is closed or the network drops in between, the money is taken and
 * nothing is recorded. This module lets the two other sources of truth settle
 * the same payments — Razorpay's webhook (settleCapturedEntity) and a periodic
 * look at Razorpay itself (reconcilePendingPayments) — through exactly the same
 * idempotent per-purchase settle functions the browser uses, so whoever gets
 * there first wins and nobody double-counts.
 */

const TARGETS = ['booking', 'order', 'job', 'amc', 'extended_warranty'];

async function settleByTarget(payment, razorpayPaymentId, method) {
  switch (payment.targetType) {
    case 'booking': return settleBookingAdvance(payment, razorpayPaymentId, { method });
    case 'order': return settleOrderPayment(payment, razorpayPaymentId, { method });
    case 'job': return settleJobPayment(payment, razorpayPaymentId, { method });
    case 'amc':
    case 'extended_warranty': return reconcileProtectionPayment(payment);
    default: return null;
  }
}

/**
 * Settles the Pending Payment that a captured Razorpay payment entity belongs
 * to (from a webhook). Returns false if there is nothing of ours to settle or
 * the entity does not match what we asked the customer to pay.
 */
export async function settleCapturedEntity(entity) {
  if (!entity?.order_id || entity.status !== 'captured') return false;
  const payment = await Payment.findOne({ gatewayRef: entity.order_id, targetType: { $in: TARGETS }, status: 'Pending' });
  if (!payment) return false;
  if (entity.currency !== 'INR' || entity.amount !== Math.round(payment.amount * 100)) {
    console.error('[payments] webhook amount mismatch', payment.id, entity.id);
    return false;
  }
  await settleByTarget(payment, entity.id, paymentMethodFromGateway(entity.method));
  return true;
}

/**
 * Looks at Razorpay for payments that are still Pending a couple of minutes
 * after they were started — the window in which a closed tab or dropped
 * connection loses the browser's confirmation — and settles the ones that were
 * in fact captured. Older ones are left to the webhook / the booking expiry.
 */
export async function reconcilePendingPayments({ now = new Date(), minAgeMs = 2 * 60 * 1000, maxAgeMs = 60 * 60 * 1000, limit = 25 } = {}) {
  const pending = await Payment.find({
    status: 'Pending',
    targetType: { $in: TARGETS },
    gatewayRef: { $regex: /^order_(?!stub_)/ },
    createdAt: { $lte: new Date(now.getTime() - minAgeMs), $gte: new Date(now.getTime() - maxAgeMs) },
  }).sort({ createdAt: 1 }).limit(limit);

  let settled = 0;
  for (const payment of pending) {
    try {
      const paymentId = await findCapturedPayment(payment.gatewayRef);
      if (!paymentId) continue;
      const capture = await verifyCapturedPayment({ orderId: payment.gatewayRef, paymentId, amount: payment.amount });
      await settleByTarget(payment, paymentId, paymentMethodFromGateway(capture?.method));
      settled += 1;
    } catch (err) {
      console.warn('[payment-reconcile]', payment.id, err.message);
    }
  }
  return { checked: pending.length, settled };
}
