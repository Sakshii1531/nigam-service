import express from 'express';
import { ExtendedWarrantyOrder } from './extendedWarrantyOrder.model.js';
import { AMCSubscription } from './amcSubscription.model.js';
import { AMCPlan } from './amcPlan.model.js';
import { ProductType } from '../catalog/productType.model.js';
import { Category } from '../catalog/category.model.js';
import { ExtendedWarrantyPlan } from './extendedWarrantyPlan.model.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../payments-wallet/paymentGateway.js';
import { env } from '../../config/env.js';

/**
 * Creates the gateway order + Pending Payment for a warranty/AMC purchase and
 * returns the block Checkout.js needs. Both purchases used to be granted with
 * no payment record at all — the customer was covered without paying.
 */
async function startPayment({ userId, targetType, targetId, amount, receipt, method = 'UPI' }) {
  if (amount <= 0) return null;

  const gatewayOrder = await createRazorpayOrder({ amount, receipt, notes: { targetType, targetId: String(targetId) } });
  await Payment.create({
    user: userId,
    targetType,
    targetId,
    amount,
    method,
    status: 'Pending',
    gatewayRef: gatewayOrder.id,
  });

  return { orderId: gatewayOrder.id, amount: gatewayOrder.amount, currency: gatewayOrder.currency, keyId: env.razorpay.keyId };
}

/** Shared verify path — the Razorpay order id always comes from the server's
 * own Pending Payment, never from the client. */
async function confirmPayment({ userId, targetType, targetId, razorpayPaymentId, razorpaySignature }) {
  const pendingPayment = await Payment.findOne({ targetType, targetId, status: { $in: ['Pending', 'Success'] } }).sort({ createdAt: -1 });
  if (!pendingPayment) {
    const err = new Error('No pending payment found');
    err.statusCode = 400;
    throw err;
  }
  if (String(pendingPayment.user) !== String(userId)) {
    const err = new Error('Not authorized to pay for this purchase');
    err.statusCode = 403;
    throw err;
  }

  const valid = verifyRazorpaySignature({
    orderId: pendingPayment.gatewayRef,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) {
    const err = new Error('Payment signature verification failed');
    err.statusCode = 400;
    throw err;
  }

  if (pendingPayment.status === 'Success') {
    if (pendingPayment.razorpayPaymentId !== razorpayPaymentId) {
      const err = new Error('This purchase was already paid with a different payment');
      err.statusCode = 400;
      throw err;
    }
    return pendingPayment;
  }

  pendingPayment.status = 'Success';
  pendingPayment.razorpayPaymentId = razorpayPaymentId;
  await pendingPayment.save();
  return pendingPayment;
}
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { protectionDetails } from './protectionDetails.js';

const router = express.Router();

/**
 * @route   GET /api/v1/warranty-amc/amc/plans?appliance=AC
 * @desc    The purchasable AMC plans (public, admin-managed). With `appliance`
 *          (a catalogue category key): that appliance's plans plus the plans
 *          that cover any appliance.
 */
router.get('/amc/plans', async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.appliance) query.applianceCategory = { $in: [String(req.query.appliance), null] };
    const plans = await AMCPlan.find(query).sort({ displayOrder: 1, price: 1 });
    // The appliance's own plans first, then the plans that cover any appliance.
    plans.sort((a, b) => Number(!a.applianceCategory) - Number(!b.applianceCategory));
    return res.json({ data: plans });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * @route   GET /api/v1/warranty-amc/amc/appliances
 * @desc    The appliance picker: each appliance with an active plan, its
 *          "from" price (cheapest plan, any-appliance plans included) and
 *          plan count — so the customer screen needs no price list of its own.
 */
router.get('/amc/appliances', async (req, res) => {
  try {
    const plans = await AMCPlan.find({ isActive: true }).select('applianceCategory price').lean();
    const generic = plans.filter((p) => !p.applianceCategory);
    const keys = [...new Set(plans.map((p) => p.applianceCategory).filter(Boolean))];
    const applianceCategories = generic.length ? await ProductType.find({ isActive: true }).distinct('category') : [];
    const categories = await Category.find({ isActive: true, $or: [{ key: { $in: keys } }, { _id: { $in: applianceCategories } }] }).select('key name sortOrder imageUrl').lean();
    // An any-appliance plan must remain discoverable even when the admin has
    // not created a separate appliance-specific plan for that category.
    if (generic.length) keys.push(...categories.map(c => c.key).filter(key => !keys.includes(key)));
    const nameOf = new Map(categories.map((c) => [c.key, c]));
    const data = keys
      .map((key) => {
        const own = plans.filter((p) => p.applianceCategory === key);
        const all = [...own, ...generic];
        return { appliance: key, name: nameOf.get(key)?.name || key, imageUrl: nameOf.get(key)?.imageUrl || null, fromPrice: Math.min(...all.map((p) => p.price)), planCount: all.length };
      })
      .sort((a, b) => (nameOf.get(a.appliance)?.sortOrder ?? 0) - (nameOf.get(b.appliance)?.sortOrder ?? 0) || a.name.localeCompare(b.name));
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * @route   GET /api/v1/warranty-amc/extended-warranty/plans
 * @desc    The purchasable extension packs (public catalog)
 */
router.get('/extended-warranty/plans', async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.category) {
      query.$or = [{ applianceCategory: req.query.category }, { applianceCategory: null }];
    }
    const plans = await ExtendedWarrantyPlan.find(query).sort({ displayOrder: 1, durationYears: 1, price: 1 });
    // The appliance's own packs first, then the packs that cover any appliance.
    plans.sort((a, b) => Number(!a.applianceCategory) - Number(!b.applianceCategory));
    return res.json({ data: plans });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * @route   GET /api/v1/warranty-amc/extended-warranty/appliances
 * @desc    The extended-warranty appliance picker: each appliance with an
 *          active pack, its "from" price and pack count (any-appliance packs
 *          included) — the Buy screen keeps no price list of its own.
 */
router.get('/extended-warranty/appliances', async (req, res) => {
  try {
    const plans = await ExtendedWarrantyPlan.find({ isActive: true }).select('applianceCategory price').lean();
    const generic = plans.filter((p) => !p.applianceCategory);
    const keys = [...new Set(plans.map((p) => p.applianceCategory).filter(Boolean))];
    const applianceCategories = generic.length ? await ProductType.find({ isActive: true }).distinct('category') : [];
    const categories = await Category.find({ isActive: true, $or: [{ key: { $in: keys } }, { _id: { $in: applianceCategories } }] }).select('key name sortOrder imageUrl').lean();
    // An any-appliance plan must remain discoverable even when the admin has
    // not created a separate appliance-specific plan for that category.
    if (generic.length) keys.push(...categories.map(c => c.key).filter(key => !keys.includes(key)));
    const byKey = new Map(categories.map((c) => [c.key, c]));
    const data = keys
      .map((key) => {
        const all = [...plans.filter((p) => p.applianceCategory === key), ...generic];
        return { appliance: key, name: byKey.get(key)?.name || key, imageUrl: byKey.get(key)?.imageUrl || null, fromPrice: Math.min(...all.map((p) => p.price)), planCount: all.length };
      })
      .sort((a, b) => (byKey.get(a.appliance)?.sortOrder ?? 0) - (byKey.get(b.appliance)?.sortOrder ?? 0) || a.name.localeCompare(b.name));
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

// Authentication middleware for user-specific operations
router.use(requireAuth);

for (const kind of ['amc','extended-warranty']) {
  router.get(`/${kind}/${kind === 'amc' ? 'subscriptions' : 'orders'}/:id`, requireRole('customer'), async (req,res,next) => {
    try { res.json({ data:await protectionDetails(req.user.id,kind,req.params.id,req.query) }); } catch (err) { next(err); }
  });
}

/**
 * @route   POST /api/v1/warranty-amc/extended-warranty/check-eligibility
 * @desc    Check eligibility for extended warranty based on appliance purchase date
 */
router.post('/extended-warranty/check-eligibility', (req, res) => {
  try {
    const { purchaseDate } = req.body;
    if (!purchaseDate) {
      return res.status(400).json({ error: { message: 'Purchase date is required' } });
    }

    const pDate = new Date(purchaseDate);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());

    // Product eligible if age <= 36 months (3 years)
    const eligible = ageInMonths <= 36;
    return res.json({
      data: {
        eligible,
        ageInMonths,
        maxEligibleAgeMonths: 36,
        reason: eligible ? 'Eligible for Extended Warranty' : 'Appliance is older than 3 years limit for extended warranty'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * @route   POST /api/v1/warranty-amc/extended-warranty/orders
 * @desc    Create & activate an extended warranty policy order
 */
router.post('/extended-warranty/orders', async (req, res) => {
  try {
    const { plan, category, brand, modelName, purchaseDate, appliance, invoiceFileUrl } = req.body;

    // The pack — and therefore the price and the duration — comes from the
    // catalogue, never from the request. The client used to post its own
    // `amountPaid`, so the price charged was whatever the browser said.
    const ewPlan = await ExtendedWarrantyPlan.findOne(
      plan ? { _id: plan, isActive: true } : { isActive: true },
    ).catch(() => null);
    if (!ewPlan) {
      return res.status(404).json({ error: { message: 'Extended warranty plan not found' } });
    }

    if (!category || (ewPlan.applianceCategory && ewPlan.applianceCategory !== category)) {
      return res.status(400).json({ error: { message: 'Plan does not cover this appliance category' } });
    }

    const validTill = new Date();
    validTill.setFullYear(validTill.getFullYear() + ewPlan.durationYears);

    // An appliance reference is only accepted if it really belongs to this
    // customer — otherwise a policy could be attached to someone else's unit.
    let applianceId = null;
    if (appliance) {
      const owned = await OwnedAppliance.findOne({ _id: appliance, deletedAt: null, user: req.user.id });
      if (!owned) return res.status(404).json({ error: { message: 'Appliance not found' } });
      if (owned.category !== category || owned.brand !== brand) return res.status(400).json({ error: { message: 'Appliance does not match this purchase' } });
      applianceId = owned._id;
    }

    // Field names here are the schema's, not the request body's: requireAuth
    // attaches `id` (not `_id`), and the model stores applianceCategory /
    // modelNumber / price. Writing the request's own names instead produced a
    // document with a null user against a required field — a guaranteed 500.
    const order = await ExtendedWarrantyOrder.create({
      user: req.user.id,
      appliance: applianceId,
      applianceCategory: category,
      brand,
      modelNumber: modelName,
      purchaseDate,
      invoiceFileUrl,
      validTill,
      tierId: ewPlan.id,
      planName: ewPlan.name,
      price: ewPlan.price,
      status: 'Active',
      paid: ewPlan.price === 0,
      coverage: ewPlan.features,
      claimsTotal: ewPlan.claimsTotal,
      claimsRemaining: ewPlan.claimsTotal,
    });

    const razorpay = await startPayment({
      userId: req.user.id,
      targetType: 'extended_warranty',
      targetId: order._id,
      amount: ewPlan.price,
      receipt: `ew_${order.id}`,
    });

    return res.status(201).json({
      data: {
        order,
        razorpay,
        certificateUrl: `/api/v1/warranty-amc/extended-warranty/orders/${order.id}/certificate.pdf`
      }
    });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * @route   POST /api/v1/warranty-amc/amc/subscriptions
 * @desc    Subscribe to an AMC Plan
 */
router.post('/amc/subscriptions', async (req, res) => {
  try {
    const { plan, planName, brand, model, appliance, category, installationDate, pincode, invoiceFileUrl } = req.body;

    // A subscription must reference a real AMCPlan — the plan is what defines
    // how many visits it carries. Accept an id, or resolve the plan by name for
    // callers that only know the label the customer picked.
    const amcPlan = plan
      ? await AMCPlan.findById(plan)
      : await AMCPlan.findOne({ name: planName || 'Annual Protection Plan', isActive: true });

    if (!amcPlan) {
      return res.status(404).json({ error: { message: 'AMC plan not found' } });
    }

    if (!amcPlan.isActive) {
      return res.status(404).json({ error: { message: 'AMC plan not found' } });
    }

    const applianceCategory = category || amcPlan.applianceCategory;
    if (!applianceCategory || (amcPlan.applianceCategory && amcPlan.applianceCategory !== applianceCategory)) {
      return res.status(400).json({ error: { message: 'Plan does not cover this appliance category' } });
    }
    let applianceId = null;
    if (appliance) {
      const owned = await OwnedAppliance.findOne({ _id: appliance, deletedAt: null, user: req.user.id, category: applianceCategory });
      if (!owned || owned.brand !== brand) return res.status(400).json({ error: { message: 'Appliance does not match this purchase' } });
      applianceId = owned._id;
    }

    // Validity comes from the plan (admin-set), not a fixed year.
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (amcPlan.durationMonths || 12));

    const subscription = await AMCSubscription.create({
      user: req.user.id,
      plan: amcPlan._id,
      appliance: applianceId,
      applianceCategory,
      paid: amcPlan.price === 0,
      brand,
      model,
      installationDate,
      pincode,
      invoiceFileUrl,
      expiryDate,
      status: 'Active',
      // Visit allowance comes from the plan, not from a hardcoded constant.
      visitsTotal: amcPlan.visitsTotal,
      visitsRemaining: amcPlan.visitsTotal,
    });

    const razorpay = await startPayment({
      userId: req.user.id,
      targetType: 'amc',
      targetId: subscription._id,
      amount: amcPlan.price,
      receipt: `amc_${subscription.id}`,
    });

    return res.status(201).json({ data: { subscription: await subscription.populate('plan'), razorpay } });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * @route   GET /api/v1/warranty-amc/extended-warranty/orders
 * @desc    Get all extended warranty policies of the logged-in customer
 */
router.get('/extended-warranty/orders', async (req, res) => {
  try {
    const orders = await ExtendedWarrantyOrder.find({ user: req.user.id });
    return res.json({ data: orders });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * @route   GET /api/v1/warranty-amc/amc/subscriptions
 * @desc    Get all AMC subscriptions of the logged-in customer
 */
router.get('/amc/subscriptions', async (req, res) => {
  try {
    const subscriptions = await AMCSubscription.find({ user: req.user.id }).populate('plan').sort({ createdAt: -1 });
    return res.json({ data: subscriptions });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

export default router;

/**
 * @route   POST /api/v1/warranty-amc/extended-warranty/orders/:id/verify-payment
 * @desc    Confirms the Razorpay Checkout payment for a policy
 */
router.post('/extended-warranty/orders/:id/verify-payment', async (req, res) => {
  try {
    const order = await ExtendedWarrantyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: { message: 'Extended warranty order not found' } });

    await confirmPayment({
      userId: req.user.id,
      targetType: 'extended_warranty',
      targetId: order._id,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
    });

    order.paid = true;
    await order.save();
    return res.json({ data: order });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: { message: err.message } });
  }
});

/**
 * @route   POST /api/v1/warranty-amc/amc/subscriptions/:id/verify-payment
 * @desc    Confirms the Razorpay Checkout payment for an AMC subscription
 */
router.post('/amc/subscriptions/:id/verify-payment', async (req, res) => {
  try {
    const subscription = await AMCSubscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ error: { message: 'AMC subscription not found' } });

    await confirmPayment({
      userId: req.user.id,
      targetType: 'amc',
      targetId: subscription._id,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
    });

    subscription.paid = true;
    await subscription.save();
    return res.json({ data: await subscription.populate('plan') });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: { message: err.message } });
  }
});
