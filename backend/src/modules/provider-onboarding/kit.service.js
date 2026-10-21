import { randomBytes, randomUUID, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
import { ProviderKit } from './kit.model.js';
import { ProviderKitOrder } from './kitOrder.model.js';
import { ProviderOnboarding } from './onboarding.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature, verifyCapturedPayment } from '../payments-wallet/paymentGateway.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { runInTransaction } from '../../utils/transaction.js';
import { logAudit } from '../shared/auditLog.js';
import { getJourney, notifyJourney, scopedProvider } from './onboarding.service.js';
import { eligibilityFor } from './eligibility.service.js';

const money = n => Math.round(n * 100) / 100;
const digest = value => createHash('sha256').update(value).digest('hex');
const key = () => createHash('sha256').update(process.env.PROVIDER_RECEIPT_KEY || env.jwt.accessSecret).digest();
function encrypt(code) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  return [iv.toString('hex'), cipher.update(code, 'utf8', 'hex') + cipher.final('hex'), cipher.getAuthTag().toString('hex')].join(':');
}
function decrypt(value) {
  const [iv, encrypted, tag] = value.split(':'), cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'hex'));
  cipher.setAuthTag(Buffer.from(tag, 'hex'));
  return cipher.update(encrypted, 'hex', 'utf8') + cipher.final('utf8');
}
export function orderView(order) {
  const value = order.toJSON ? order.toJSON() : { ...order };
  delete value.receiptHash; delete value.receiptCodeEncrypted;
  return value;
}
export async function saveKit(actor, input, id) {
  if (input.qualifiesForOnboarding && input.price <= 0) throw new ApiError(400, 'A qualifying onboarding kit must have a positive selling price');
  const kit = id ? await ProviderKit.findById(id) : new ProviderKit();
  if (!kit) throw new ApiError(404, 'Kit not found');
  if (id && input.expectedStockRevision !== kit.stockRevision) throw new ApiError(409, 'Kit stock changed. Reload the catalog before saving.');
  const { expectedStockRevision: _revision, ...updates } = input;
  Object.assign(kit, updates);
  kit.stockRevision++;
  await kit.save();
  await logAudit({ user: actor.id, action: id ? 'provider_kit.updated' : 'provider_kit.created', type: 'Finance', entityType: 'ProviderKit', entityId: kit._id });
  return kit;
}
export async function listKits(admin = false) { return ProviderKit.find(admin ? {} : { isActive: true }).sort({ createdAt: -1 }); }
export async function listKitOrders(actor, providerId) {
  if (actor.role === 'service_provider') return ProviderKitOrder.find({ user: actor.id }).sort({ createdAt: -1 }).limit(100);
  if (providerId) { await scopedProvider(providerId, actor); return ProviderKitOrder.find({ serviceProvider: providerId }).sort({ createdAt: -1 }).limit(100); }
  if (actor.role === 'asm') throw new ApiError(400, 'Select a provider from your area');
  return ProviderKitOrder.find().populate('serviceProvider', 'name phone serviceCityName').sort({ createdAt: -1 }).limit(200);
}
async function ownedOrder(id, actor, session = null, secret = false) {
  const query = ProviderKitOrder.findById(id).session(session);
  if (secret) query.select('+receiptHash +receiptCodeEncrypted');
  const order = await query;
  if (!order) throw new ApiError(404, 'Kit order not found');
  await scopedProvider(order.serviceProvider, actor, session);
  return order;
}
function checkoutView(order) {
  return { order: orderView(order), razorpay: order.paymentStatus === 'Pending' && order.gatewayOrderId ? { orderId: order.gatewayOrderId, amount: Math.round(order.total * 100), currency: 'INR', keyId: env.razorpay.keyId || '' } : null };
}
export async function checkoutKits(providerId, actor, input) {
  const journey = await getJourney(providerId, actor);
  if (!journey.canBuyKits) throw new ApiError(409, 'Final approval is required before purchasing kits');
  const fingerprint = digest(JSON.stringify({ items: input.items, recipient: input.recipient }));
  const existing = await ProviderKitOrder.findOne({ user: actor.id, checkoutKey: input.checkoutKey });
  if (existing) {
    if (existing.checkoutFingerprint !== fingerprint) throw new ApiError(409, 'Checkout details changed. Start a new checkout.');
    if (!existing.gatewayOrderId && existing.paymentStatus === 'Pending') throw new ApiError(409, 'Checkout is being prepared. Retry shortly.');
    return checkoutView(existing);
  }
  if (new Set(input.items.map(i => i.kit)).size !== input.items.length) throw new ApiError(400, 'Combine quantities for each kit into one line');
  const order = await runInTransaction(async session => {
    const p = await scopedProvider(providerId, actor, session);
    // Serializes checkout against final approval changes/suspension.
    await ServiceProvider.updateOne({ _id: p._id }, { $inc: { eligibilityRevision: 1 } }, { session });
    const app = await ProviderOnboarding.findOne({ serviceProvider: p._id }).session(session);
    if (!(p.legacyExemption?.recordedAt && p.onboardingPolicyVersion === 0) && app?.state !== 'APPROVED') throw new ApiError(409, 'Final approval is required');
    const items = [];
    for (const item of input.items) {
      const kit = await ProviderKit.findOneAndUpdate({ _id: item.kit, isActive: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity, stockRevision: 1 } }, { new: true, session });
      if (!kit) throw new ApiError(409, 'A selected kit is unavailable or out of stock');
      items.push({ kit: kit._id, sku: kit.sku, name: kit.name, price: kit.price, shippingCharge: kit.shippingCharge, quantity: item.quantity, qualifiesForOnboarding: kit.qualifiesForOnboarding });
    }
    const subtotal = money(items.reduce((n, i) => n + i.price * i.quantity, 0)), shipping = money(items.reduce((n, i) => n + i.shippingCharge * i.quantity, 0));
    if (subtotal + shipping <= 0) throw new ApiError(400, 'Online kit checkout requires a positive total');
    const [created] = await ProviderKitOrder.create([{ user: actor.id, serviceProvider: p._id, checkoutKey: input.checkoutKey, checkoutFingerprint: fingerprint, humanId: `KIT-${randomUUID().slice(0, 12).toUpperCase()}`, items, recipient: input.recipient, subtotal, shipping, total: money(subtotal + shipping), expiresAt: new Date(Date.now() + 30 * 60000), events: [{ action: 'checkout.created', actor: actor.id }] }], { session });
    const [payment] = await Payment.create([{ user: actor.id, targetType: 'provider_kit_order', targetId: created._id, amount: created.total, method: 'UPI', status: 'Pending' }], { session });
    created.payment = payment._id; await created.save({ session });
    return created;
  }, { required: true });
  try {
    const gateway = await createRazorpayOrder({ amount: order.total, receipt: order.humanId, notes: { providerKitOrderId: order.id } });
    await runInTransaction(async session => {
      await Payment.updateOne({ _id: order.payment }, { $set: { gatewayRef: gateway.id } }, { session });
      await ProviderKitOrder.updateOne({ _id: order._id }, { $set: { gatewayOrderId: gateway.id } }, { session });
    }, { required: true });
    order.gatewayOrderId = gateway.id;
  } catch (error) {
    await releaseOrderStock(order._id, 'Checkout could not be prepared', 'Failed');
    throw error;
  }
  return checkoutView(order);
}
async function releaseOrderStock(id, reason, paymentStatus = 'Failed') {
  await runInTransaction(async session => {
    const order = await ProviderKitOrder.findOneAndUpdate({ _id: id, paymentStatus: 'Pending', stockReleased: false }, { $set: { stockReleased: true, status: 'Cancelled', paymentStatus } }, { new: true, session });
    if (!order) return;
    for (const item of order.items) await ProviderKit.updateOne({ _id: item.kit }, { $inc: { stock: item.quantity, stockRevision: 1 } }, { session });
    await Payment.updateOne({ _id: order.payment, status: 'Pending' }, { $set: { status: 'Failed' } }, { session });
    order.events.push({ action: 'checkout.expired', message: reason }); await order.save({ session });
  }, { required: true });
}
export async function expireKitCheckouts() {
  const orders = await ProviderKitOrder.find({ paymentStatus: 'Pending', expiresAt: { $lte: new Date() }, stockReleased: false }).select('_id');
  for (const order of orders) await releaseOrderStock(order._id, 'Payment reservation expired');
  return orders.length;
}
export async function settleKitPayment(id, paymentId) {
  let order = await ProviderKitOrder.findById(id);
  if (!order) throw new ApiError(404, 'Kit order not found');
  const paymentFacts = await verifyCapturedPayment({ orderId: order.gatewayOrderId, paymentId, amount: order.total });
  let changed = false;
  await runInTransaction(async session => {
    changed = false;
    order = await ProviderKitOrder.findById(id).session(session);
    if (order.gatewayPaymentId && order.gatewayPaymentId !== paymentId) throw new ApiError(409, 'This order already has a different payment');
    // Gateway callbacks can arrive after refund completion or repeat a late
    // capture. A previously settled payment must never revive the order.
    if (['Paid', 'PaymentReview', 'RefundPending', 'Refunded'].includes(order.paymentStatus)) {
      return;
    }
    if (order.stockReleased || order.status === 'Cancelled') {
      order.paymentStatus = 'PaymentReview'; order.gatewayPaymentId = paymentId;
      order.events.push({ action: 'payment.review_required', message: 'Payment captured after stock reservation ended; refund or fulfilment review required' });
    } else {
      order.paymentStatus = 'Paid'; order.status = 'Processing'; order.gatewayPaymentId = paymentId;
      order.events.push({ action: 'payment.paid' });
    }
    changed = true;
    await order.save({ session });
    await Payment.updateOne({ _id: order.payment }, { $set: { status: 'Success', razorpayPaymentId: paymentId, method: ({ card: 'Card', upi: 'UPI', netbanking: 'NetBanking', wallet: 'Wallet' })[paymentFacts?.method] || 'UPI' } }, { session });
    await logAudit({ action: 'provider_kit.payment_settled', type: 'Finance', entityType: 'ProviderKitOrder', entityId: order._id, meta: { paymentId, state: order.paymentStatus } }, { session });
  }, { required: true });
  const provider = await ServiceProvider.findById(order.serviceProvider);
  if (changed) await notifyJourney(provider, 'Kit payment received', `${order.humanId}: ${order.paymentStatus === 'Paid' ? 'Your kit is ready for processing. Jobs unlock after verified receipt.' : 'Your payment needs fulfilment review. Contact support.'}`, { managers: true });
  return orderView(order);
}
export async function verifyKitPayment(id, actor, input) {
  const order = await ownedOrder(id, actor);
  if (!order.gatewayOrderId || !verifyRazorpaySignature({ orderId: order.gatewayOrderId, paymentId: input.razorpayPaymentId, signature: input.razorpaySignature })) throw new ApiError(400, 'Invalid payment signature');
  return settleKitPayment(id, input.razorpayPaymentId);
}
export async function recoverKitPayment(id, actor) {
  const order = await ownedOrder(id, actor);
  if (order.paymentStatus === 'Paid') return orderView(order);
  const { findCapturedPayment } = await import('../payments-wallet/paymentGateway.js');
  const paymentId = await findCapturedPayment(order.gatewayOrderId);
  if (!paymentId) throw new ApiError(409, 'No captured payment found yet. Retry payment or check again shortly.');
  return settleKitPayment(id, paymentId);
}
export async function getKitOrder(id, actor) { return checkoutView(await ownedOrder(id, actor)); }
export async function fulfilKitOrder(id, actor, input) {
  const result = await runInTransaction(async session => {
    const order = await ownedOrder(id, actor, session, true);
    if (actor.role !== 'super_admin') throw new ApiError(403, 'Only super admin can process kit orders');
    const transitions = { Processing: 'Packed', Packed: 'Shipped', Shipped: 'Delivered' };
    if (order.paymentStatus !== 'Paid' || transitions[order.status] !== input.status) throw new ApiError(409, 'Kit orders must be paid and processed in sequence');
    if (input.status === 'Packed') {
      const code = randomBytes(8).toString('hex').toUpperCase();
      order.receiptHash = digest(code); order.receiptCodeEncrypted = encrypt(code);
    }
    if (input.status === 'Shipped') {
      if (!input.courier?.trim() || !input.trackingNumber?.trim()) throw new ApiError(400, 'Enter the courier and actual tracking number');
      order.courier = input.courier; order.trackingNumber = input.trackingNumber;
      order.receiptCodeEncrypted = undefined;
    }
    order.status = input.status;
    order.events.push({ action: `fulfilment.${input.status}`, actor: actor.id, message: input.reason });
    await order.save({ session });
    await logAudit({ user: actor.id, action: `provider_kit.${input.status}`, type: 'Inventory', entityType: 'ProviderKitOrder', entityId: order._id }, { session });
    return orderView(order);
  }, { required: true });
  const p = await ServiceProvider.findById(result.serviceProvider);
  await notifyJourney(p, `Kit order ${result.status}`, `${result.humanId}: ${result.status === 'Delivered' ? 'Enter the code inside your parcel to verify receipt.' : result.status}`, { managers: false });
  return result;
}
export async function packingCode(id, actor) {
  const order = await ownedOrder(id, actor, null, true);
  if (actor.role !== 'super_admin' || order.status !== 'Packed' || !order.receiptCodeEncrypted) throw new ApiError(409, 'Receipt insert is available only while packing');
  await logAudit({ user: actor.id, action: 'provider_kit.receipt_insert_printed', type: 'Inventory', entityType: 'ProviderKitOrder', entityId: order._id });
  return { humanId: order.humanId, code: decrypt(order.receiptCodeEncrypted) };
}
export async function verifyKitReceipt(id, actor, input) {
  // Increment attempts outside the activation transaction so failed attempts persist.
  const existing = await ownedOrder(id, actor, null, true);
  if (existing.status === 'ReceiptVerified') return orderView(existing);
  if (existing.paymentStatus !== 'Paid' || !['Shipped', 'Delivered'].includes(existing.status)) throw new ApiError(409, 'Only a paid, shipped kit can be received');
  const exception = actor.role === 'super_admin' && input.exceptionReason?.trim();
  if (!exception && actor.role !== 'service_provider') throw new ApiError(403, 'Only the order owner may enter a receipt code');
  if (!exception) {
    if (existing.receiptLockedUntil > new Date()) throw new ApiError(429, 'Too many incorrect codes. Try again in 15 minutes.');
    const supplied = Buffer.from(digest(String(input.code || '').trim().toUpperCase()), 'hex'), expected = Buffer.from(existing.receiptHash || '', 'hex');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      const attempts = await ProviderKitOrder.findByIdAndUpdate(id, { $inc: { receiptAttempts: 1 } }, { new: true });
      if (attempts.receiptAttempts % 5 === 0) await ProviderKitOrder.updateOne({ _id: id }, { $set: { receiptLockedUntil: new Date(Date.now() + 15 * 60000) } });
      throw new ApiError(400, 'The receipt code is incorrect');
    }
  }
  const order = await runInTransaction(async session => {
    const current = await ownedOrder(id, actor, session, true);
    if (current.status === 'ReceiptVerified') return current;
    if (current.paymentStatus !== 'Paid' || !['Shipped', 'Delivered'].includes(current.status)) throw new ApiError(409, 'Order state changed; reload before verifying receipt');
    current.status = 'ReceiptVerified'; current.receiptVerifiedAt = new Date(); current.receiptExceptionReason = exception || undefined; current.receiptHash = undefined;
    current.events.push({ action: 'receipt.verified', actor: actor.id, message: exception ? `Admin verification exception: ${exception}` : 'Provider verified the code packed inside the parcel' });
    await current.save({ session });
    if (current.items.some(i => i.qualifiesForOnboarding)) {
      await ProviderOnboarding.updateOne({ serviceProvider: current.serviceProvider, state: 'APPROVED' }, { $set: { qualifyingOrder: current._id, receiptVerifiedAt: current.receiptVerifiedAt }, $inc: { revision: 1 }, $push: { events: { action: 'kit.received', actor: actor.id, actorRole: actor.role, at: new Date(), message: current.humanId } } }, { session });
      const p = await ServiceProvider.findById(current.serviceProvider).session(session);
      const readiness = await eligibilityFor(p, { session });
      await ServiceProvider.updateOne({ _id: p._id }, { $set: { jobEligible: readiness.eligible }, $inc: { eligibilityRevision: 1 } }, { session });
    }
    await logAudit({ user: actor.id, action: 'provider_kit.receipt_verified', type: 'Inventory', entityType: 'ProviderKitOrder', entityId: current._id, reason: exception || 'Parcel code verified' }, { session });
    return current;
  }, { required: true });
  const p = await ServiceProvider.findById(order.serviceProvider), ready = await eligibilityFor(p);
  await notifyJourney(p, ready.eligible ? 'Ready for jobs — go online' : 'Kit receipt verified', ready.eligible ? 'Your onboarding is complete. Go online to receive jobs in your approved categories.' : 'Your kit was received. Complete the remaining onboarding steps.', { managers: true });
  return orderView(order);
}
export async function reportKitIssue(id, actor, reason) {
  const order = await ownedOrder(id, actor);
  order.events.push({ action: 'delivery.help_requested', actor: actor.id, message: reason }); await order.save();
  await notifyJourney(await ServiceProvider.findById(order.serviceProvider), 'Kit delivery help requested', `${order.humanId}: ${reason}`, { managers: true });
  return orderView(order);
}

export async function completeKitRefund(id, refund) {
  const result = await runInTransaction(async session => {
    const order = await ProviderKitOrder.findById(id).session(session);
    if (!order || !['Paid', 'PaymentReview', 'RefundPending', 'Refunded'].includes(order.paymentStatus)) throw new ApiError(409, 'No refund is awaiting confirmation');
    if (refund.payment_id !== order.gatewayPaymentId || refund.amount !== Math.round(order.total * 100) || refund.currency !== 'INR') throw new ApiError(400, 'Refund does not match the original payment');
    if (order.paymentStatus === 'Refunded') return order;
    order.refundReference = refund.id;
    if (refund.status === 'processed') {
      const unshipped = ['Processing', 'Packed', 'AwaitingPayment', 'Cancelled'].includes(order.status);
      order.paymentStatus = 'Refunded'; order.status = unshipped ? 'Cancelled' : 'Returned';
      if (unshipped && !order.stockReleased) {
        for (const item of order.items) await ProviderKit.updateOne({ _id: item.kit }, { $inc: { stock: item.quantity, stockRevision: 1 } }, { session });
        order.stockReleased = true;
      }
      await Payment.updateOne({ _id: order.payment }, { $set: { status: 'Refunded' } }, { session });
      order.events.push({ action: 'payment.refunded', message: `Full refund confirmed: ${refund.id}` });
    }
    await order.save({ session });
    const provider = await ServiceProvider.findById(order.serviceProvider).session(session), readiness = await eligibilityFor(provider, { session });
    provider.jobEligible = readiness.eligible; provider.eligibilityRevision++;
    if (!readiness.eligible) provider.availability = 'Offline';
    await provider.save({ session });
    await logAudit({ action: 'provider_kit.refund_confirmed', type: 'Finance', entityType: 'ProviderKitOrder', entityId: order._id, meta: { refundId: refund.id, status: refund.status } }, { session });
    return order;
  }, { required: true });
  await notifyJourney(await ServiceProvider.findById(result.serviceProvider), 'Kit refund updated', `${result.humanId}: ${result.paymentStatus}`, { managers: true });
  return orderView(result);
}
export async function refundKitOrder(id, actor, reason) {
  const original = await ownedOrder(id, actor);
  if (actor.role !== 'super_admin') throw new ApiError(403, 'Only super admin can refund kits');
  if (original.paymentStatus === 'RefundPending') return recoverKitRefund(id, actor);
  if (!['Paid', 'PaymentReview'].includes(original.paymentStatus)) throw new ApiError(409, 'Only a captured payment can be refunded');
  await runInTransaction(async session => {
    const order = await ownedOrder(id, actor, session);
    if (!['Paid', 'PaymentReview'].includes(order.paymentStatus)) throw new ApiError(409, 'Refund is already in progress');
    order.paymentStatus = 'RefundPending'; order.receiptHash = undefined; order.receiptCodeEncrypted = undefined;
    order.events.push({ action: 'payment.refund_requested', actor: actor.id, message: reason }); await order.save({ session });
    const provider = await ServiceProvider.findById(order.serviceProvider).session(session), readiness = await eligibilityFor(provider, { session });
    provider.jobEligible = readiness.eligible; provider.eligibilityRevision++;
    if (!readiness.eligible) provider.availability = 'Offline';
    await provider.save({ session });
    await logAudit({ user: actor.id, action: 'provider_kit.refund_requested', type: 'Finance', entityType: 'ProviderKitOrder', entityId: order._id, reason }, { session });
  }, { required: true });
  const provider = await ServiceProvider.findById(original.serviceProvider);
  await notifyJourney(provider, 'Kit refund requested', `${original.humanId}: ${reason}`, { managers: true });
  const { refundKitPayment } = await import('../payments-wallet/paymentGateway.js');
  // No blind retries after a network failure: the recovery endpoint queries the
  // gateway for this exact refund, so it cannot issue the refund twice.
  const refund = await refundKitPayment({ paymentId: original.gatewayPaymentId, amount: original.total, orderId: original.id });
  return completeKitRefund(id, refund);
}
export async function recoverKitRefund(id, actor) {
  const order = await ownedOrder(id, actor);
  if (actor.role !== 'super_admin') throw new ApiError(403, 'Only super admin may reconcile refunds');
  const { findKitRefund } = await import('../payments-wallet/paymentGateway.js');
  const refund = await findKitRefund({ paymentId: order.gatewayPaymentId, refundId: order.refundReference, orderId: order.id });
  if (!refund) throw new ApiError(409, 'Refund not yet confirmed by the gateway. Check the gateway record before taking further action.');
  return completeKitRefund(id, refund);
}
