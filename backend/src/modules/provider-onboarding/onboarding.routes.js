import { upload } from '../shared/fileUpload.js';
import { storePrivateKyc, privateKycLink } from './kycStorage.js';
import { ProviderOnboarding } from './onboarding.model.js';
import { runInTransaction } from '../../utils/transaction.js';
import { Router } from 'express';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireAuth, requireRole, requireAsmPermission } from '../../middleware/auth.js';
import { attachServiceProvider } from '../../middleware/serviceProvider.js';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ProviderKitOrder } from './kitOrder.model.js';
import * as onboarding from './onboarding.service.js';
import * as kits from './kit.service.js';
const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const reason = z.string().trim().min(3).max(2000);
const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
const actor = req => req.user;
const kitSchema = z.object({ expectedStockRevision: z.number().int().min(0).optional(), sku: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(150), description: z.string().max(4000).default(''), contents: z.array(z.string().trim().min(1).max(200)).max(50).default([]), imageUrl: z.string().max(2000).default(''), price: z.number().finite().positive().max(1000000).multipleOf(0.01), shippingCharge: z.number().finite().min(0).max(100000).multipleOf(0.01).default(0), stock: z.number().int().min(0).max(100000), qualifiesForOnboarding: z.boolean(), isActive: z.boolean().default(true) }).strict();
const checkoutSchema = z.object({ checkoutKey: z.string().min(10).max(100), items: z.array(z.object({ kit: oid, quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(30), recipient: z.object({ name: z.string().trim().min(2).max(120), phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit shipping phone'), house: z.string().trim().min(3).max(300), landmark: z.string().trim().max(200).default(''), city: z.string().trim().min(2).max(100), state: z.string().trim().min(2).max(100), pincode: z.string().regex(/^\d{6}$/, 'Enter a six-digit pincode') }).strict() }).strict();
const reviewSchema = z.object({ revision: z.number().int().min(0), action: z.enum(['schedule', 'request_changes', 'interview_pass', 'interview_reject', 'final_approve', 'final_reject']), reason, notes: z.string().max(4000).optional(), exceptionReason: reason.optional(), interviewAt: z.string().datetime().optional(), documentsVerified: z.boolean().optional(), backgroundVerified: z.boolean().optional(), categoryDecisions: z.array(z.object({ category: oid, approved: z.boolean(), reason: z.string().trim().min(1).max(500) })).optional(), approvedCategories: z.array(oid).optional() }).strict().refine(v => v.action !== 'schedule' || Boolean(v.interviewAt), { message: 'Set an interview date' });

export const providerOnboardingRouter = Router();
providerOnboardingRouter.use(requireAuth, requireRole('service_provider'), attachServiceProvider);
providerOnboardingRouter.get('/', wrap(async (req, res) => ok(res, await onboarding.getJourney(req.serviceProvider.id, actor(req)))));
providerOnboardingRouter.get('/documents/:side', wrap(async (req, res) => {
  const field = { front: 'aadharFrontUrl', back: 'aadharBackUrl' }[req.params.side];
  if (!field) throw new ApiError(404, 'Document not found');
  res.set('Cache-Control', 'no-store');
  ok(res, await privateKycLink(req.serviceProvider.verification[field]));
}));
providerOnboardingRouter.post('/documents', upload.fields([{ name: 'aadharFront', maxCount: 1 }, { name: 'aadharBack', maxCount: 1 }]), wrap(async (req, res) => {
  const app = await ProviderOnboarding.findOne({ serviceProvider: req.serviceProvider.id });
  if (!app || !['CHANGES_REQUESTED', 'ASM_REJECTED', 'SUPER_ADMIN_REJECTED'].includes(app.state)) throw new ApiError(409, 'Document uploads require an application open for changes');
  if (!req.files?.aadharFront?.[0] || !req.files?.aadharBack?.[0]) throw new ApiError(400, 'Upload both Aadhaar documents');
  const front = await storePrivateKyc(req.files.aadharFront[0]), back = await storePrivateKyc(req.files.aadharBack[0]);
  await runInTransaction(async session => {
    const current = await ProviderOnboarding.findOne({ serviceProvider: req.serviceProvider.id }).session(session);
    if (current.revision !== app.revision || !['CHANGES_REQUESTED', 'ASM_REJECTED', 'SUPER_ADMIN_REJECTED'].includes(current.state)) throw new ApiError(409, 'Application changed; reload before uploading');
    current.documentReview = { aadhar: 'Pending', background: 'Pending' }; current.revision++;
    current.events.push({ action: 'documents.replaced', actor: req.user.id, actorRole: req.user.role, message: 'Aadhaar documents replaced for review' });
    await current.save({ session });
    const p = await onboarding.scopedProvider(req.serviceProvider.id, req.user, session);
    p.verification.aadharFrontUrl = front; p.verification.aadharBackUrl = back; p.verification.aadharStatus = 'Pending'; p.verification.backgroundCheckStatus = 'Pending';
    await p.save({ session });
  }, { required: true });
  ok(res, await onboarding.getJourney(req.serviceProvider.id, actor(req)));
}));
providerOnboardingRouter.post('/resubmit', validate(z.object({ revision: z.number().int().min(0), categories: z.array(z.string()).min(1), reason: reason.optional() }).strict()), wrap(async (req, res) => ok(res, await onboarding.resubmitApplication(req.serviceProvider.id, actor(req), req.body))));

export const providerKitRouter = Router();
providerKitRouter.use(requireAuth, requireRole('service_provider'), attachServiceProvider);
providerKitRouter.get('/', wrap(async (_req, res) => ok(res, await kits.listKits())));
providerKitRouter.get('/orders', wrap(async (req, res) => ok(res, (await kits.listKitOrders(actor(req))).map(kits.orderView))));
providerKitRouter.post('/orders', validate(checkoutSchema), wrap(async (req, res) => ok(res, await kits.checkoutKits(req.serviceProvider.id, actor(req), req.body), {}, 201)));
providerKitRouter.use('/orders/:id', validate(z.object({ id: oid }), 'params'));
providerKitRouter.get('/orders/:id', wrap(async (req, res) => ok(res, await kits.getKitOrder(req.params.id, actor(req)))));
providerKitRouter.post('/orders/:id/verify-payment', validate(z.object({ razorpayPaymentId: z.string().min(1).max(100), razorpaySignature: z.string().regex(/^[a-f\d]{64}$/i) }).strict()), wrap(async (req, res) => ok(res, await kits.verifyKitPayment(req.params.id, actor(req), req.body))));
providerKitRouter.post('/orders/:id/recover-payment', wrap(async (req, res) => ok(res, await kits.recoverKitPayment(req.params.id, actor(req)))));
providerKitRouter.post('/orders/:id/receipt', validate(z.object({ code: z.string().min(1).max(100) }).strict()), wrap(async (req, res) => ok(res, await kits.verifyKitReceipt(req.params.id, actor(req), req.body))));
providerKitRouter.post('/orders/:id/help', validate(z.object({ reason }).strict()), wrap(async (req, res) => ok(res, await kits.reportKitIssue(req.params.id, actor(req), req.body.reason))));

export const adminOnboardingRouter = Router();
adminOnboardingRouter.use(requireAuth, requireRole('super_admin', 'asm'), requireAsmPermission('techs:view'));
adminOnboardingRouter.get('/', wrap(async (req, res) => ok(res, await onboarding.listJourneys(actor(req), req.query))));
adminOnboardingRouter.use('/:id', validate(z.object({ id: oid }), 'params'));
adminOnboardingRouter.get('/:id', wrap(async (req, res) => ok(res, await onboarding.getJourney(req.params.id, actor(req)))));
adminOnboardingRouter.get('/:id/documents/:side', wrap(async (req, res) => {
  const provider = await onboarding.scopedProvider(req.params.id, actor(req));
  const field = { front: 'aadharFrontUrl', back: 'aadharBackUrl' }[req.params.side];
  if (!field) throw new ApiError(404, 'Document not found');
  res.set('Cache-Control', 'no-store');
  ok(res, await privateKycLink(provider.verification[field]));
}));
adminOnboardingRouter.get('/:id/kit-orders', wrap(async (req, res) => ok(res, (await kits.listKitOrders(actor(req), req.params.id)).map(kits.orderView))));
adminOnboardingRouter.post('/:id/review', requireAsmPermission('techs:manage'), validate(reviewSchema), wrap(async (req, res) => ok(res, await onboarding.reviewOnboarding(req.params.id, actor(req), req.body))));

export const adminKitRouter = Router();
adminKitRouter.use(requireAuth, requireRole('super_admin'));
adminKitRouter.get('/', wrap(async (_req, res) => ok(res, await kits.listKits(true))));
adminKitRouter.post('/', validate(kitSchema), wrap(async (req, res) => ok(res, await kits.saveKit(actor(req), req.body), {}, 201)));
adminKitRouter.patch('/:id', validate(z.object({ id: oid }), 'params'), validate(kitSchema), wrap(async (req, res) => ok(res, await kits.saveKit(actor(req), req.body, req.params.id))));

export const adminKitOrderRouter = Router();
adminKitOrderRouter.use(requireAuth, requireRole('super_admin'));
adminKitOrderRouter.get('/', wrap(async (req, res) => ok(res, (await kits.listKitOrders(actor(req))).map(kits.orderView))));
adminKitOrderRouter.use('/:id', validate(z.object({ id: oid }), 'params'));
adminKitOrderRouter.get('/:id', wrap(async (req, res) => ok(res, await kits.getKitOrder(req.params.id, actor(req)))));
adminKitOrderRouter.post('/:id/fulfil', validate(z.object({ status: z.enum(['Packed', 'Shipped', 'Delivered']), courier: z.string().trim().max(100).optional(), trackingNumber: z.string().trim().max(200).optional(), reason: reason.optional() }).strict()), wrap(async (req, res) => ok(res, await kits.fulfilKitOrder(req.params.id, actor(req), req.body))));
adminKitOrderRouter.get('/:id/packing-insert', wrap(async (req, res) => { res.set('Cache-Control', 'no-store'); ok(res, await kits.packingCode(req.params.id, actor(req))); }));
adminKitOrderRouter.post('/:id/refund', validate(z.object({ reason }).strict()), wrap(async (req, res) => ok(res, await kits.refundKitOrder(req.params.id, actor(req), req.body.reason))));
adminKitOrderRouter.post('/:id/recover-refund', wrap(async (req, res) => ok(res, await kits.recoverKitRefund(req.params.id, actor(req)))));
adminKitOrderRouter.post('/:id/receipt-exception', validate(z.object({ exceptionReason: reason }).strict()), wrap(async (req, res) => ok(res, await kits.verifyKitReceipt(req.params.id, actor(req), req.body))));

export const providerPaymentWebhookRouter = Router();
providerPaymentWebhookRouter.post('/', wrap(async (req, res) => {
  const secret = process.env.PROVIDER_KIT_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, 'Kit payment webhook is not configured');
  const signature = req.get('x-razorpay-signature') || '';
  const expected = createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
  if (!/^[a-f\d]{64}$/i.test(signature) || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) throw new ApiError(400, 'Invalid webhook signature');
  const payment = req.body?.payload?.payment?.entity;
  if (req.body?.event === 'payment.captured' && payment?.order_id) {
    const order = await ProviderKitOrder.findOne({ gatewayOrderId: payment.order_id });
    if (order) {
      if (payment.amount !== Math.round(order.total * 100) || payment.currency !== 'INR' || payment.status !== 'captured') throw new ApiError(400, 'Webhook payment does not match order');
      await kits.settleKitPayment(order.id, payment.id);
    }
  }
  const refund = req.body?.payload?.refund?.entity;
  if (req.body?.event === 'refund.processed' && refund?.payment_id) {
    if (refund.status !== 'processed') throw new ApiError(400, 'Refund is not processed');
    const order = await ProviderKitOrder.findOne({ gatewayPaymentId: refund.payment_id, paymentStatus: { $in: ['Paid', 'PaymentReview', 'RefundPending'] } });
    if (order) await kits.completeKitRefund(order.id, refund);
  }
  ok(res, { received: true });
}));
