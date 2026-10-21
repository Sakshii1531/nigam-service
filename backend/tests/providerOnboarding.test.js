import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { randomUUID, createHmac } from 'node:crypto';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { ProviderOnboarding } from '../src/modules/provider-onboarding/onboarding.model.js';
import { ProviderKit } from '../src/modules/provider-onboarding/kit.model.js';
import { ProviderKitOrder } from '../src/modules/provider-onboarding/kitOrder.model.js';
import { Notification, } from '../src/modules/notifications/notification.model.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { signForTesting } from '../src/modules/payments-wallet/paymentGateway.js';
import { eligibilityFor, migrateLegacyProviders } from '../src/modules/provider-onboarding/eligibility.service.js';
import { expireKitCheckouts } from '../src/modules/provider-onboarding/kit.service.js';
import { removePrivateKyc } from '../src/modules/provider-onboarding/kycStorage.js';
import { readOtpCode } from './helpers/otp.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
let server, seq = 9392000000;
const api = (method, path, token, body) => request(server)[method](`/api/v1${path}`).set('Authorization', `Bearer ${token || ''}`).send(body);
async function login(role, identifier) {
  await api('post', '/auth/login', null, { role, identifier, password: 'password123' }).expect(200);
  return (await api('post', '/auth/otp/verify', null, { role, identifier, code: readOtpCode(identifier) }).expect(200)).body.data;
}
async function clearDocs() { for (const p of await ServiceProvider.find()) for (const ref of [p.verification?.aadharFrontUrl, p.verification?.aadharBackUrl]) if (ref?.startsWith('kyc-')) await removePrivateKyc(ref); }
beforeAll(async () => { await registerAllModels(); await mongoose.connect(testDbUri('providerOnboarding')); await ensureIndexes(); server = await listenOnLoopback(createApp()); }, 60000);
beforeEach(async () => { await awaitPendingDeliveries(); await clearDocs(); await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({}))); });
afterAll(async () => { await awaitPendingDeliveries(); await clearDocs(); await closeServer(server); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
async function fixture() {
  const categories = await Category.create(['AC', 'Washing Machine', 'CCTV', 'Plumbing', 'Electrical'].map(key => ({ key, name: key })));
  const city = await City.create({ name: 'Onboarding City', state: 'Maharashtra', status: 'Active' });
  const otherCity = await City.create({ name: 'Other City', state: 'Maharashtra', status: 'Active' });
  const email = `onboard-admin-${seq++}@test.local`;
  await User.create({ role: 'super_admin', name: 'Onboarding Admin', email, passwordHash: await hashPassword('password123'), status: 'Active' });
  const admin = await login('super_admin', email);
  await Permission.create([{ key: 'techs:view' }, { key: 'techs:manage' }]);
  const asmEmail = `onboard-asm-${seq++}@test.local`, otherAsmEmail = `onboard-other-${seq++}@test.local`;
  for (const [email, area] of [[asmEmail, city], [otherAsmEmail, otherCity]]) await api('post', '/super-admin/asms', admin.accessToken, { name: 'Area Manager', email, password: 'password123', city: String(area._id), permissions: ['techs:view', 'techs:manage'] }).expect(201);
  const asm = await login('asm', asmEmail), otherAsm = await login('asm', otherAsmEmail), phone = String(seq++);
  const application = (await request(server).post('/api/v1/service-provider/register').field('name', 'New Provider').field('phone', phone).field('password', 'password123').field('city', city.name).field('state', city.state).field('specs', JSON.stringify(categories.map(c => String(c._id)))).attach('aadharFront', Buffer.from('%PDF-1.4\nfront'), { filename: 'front.pdf', contentType: 'application/pdf' }).attach('aadharBack', Buffer.from('%PDF-1.4\nback'), { filename: 'back.pdf', contentType: 'application/pdf' }).expect(201)).body.data;
  return { categories, city, admin, asm, otherAsm, application, provider: await login('service_provider', phone) };
}
async function passInterview(w, actor = w.asm, exception = false) {
  const app = await ProviderOnboarding.findOne({ serviceProvider: w.application.id });
  return (await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, actor.accessToken, { revision: app.revision, action: 'interview_pass', reason: 'Demonstrated AC and washing machine skills', notes: 'Private practical assessment notes', documentsVerified: true, backgroundVerified: true, categoryDecisions: w.categories.map((c, i) => ({ category: String(c._id), approved: i < 2, reason: i < 2 ? 'Practical skills demonstrated' : 'Needs further training' })), ...(exception ? { exceptionReason: 'Area ASM unavailable' } : {}) }).expect(200)).body.data;
}
async function approve(w) { await passInterview(w); const app = await ProviderOnboarding.findOne({ serviceProvider: w.application.id }); await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, w.admin.accessToken, { revision: app.revision, action: 'final_approve', reason: 'Final review passed' }).expect(200); }
async function kit(w, qualifies = true, stock = 5) { return (await api('post', '/super-admin/provider-kits', w.admin.accessToken, { sku: `KIT-${seq++}`, name: qualifies ? 'Onboarding Kit' : 'Extra Kit', price: 799, shippingCharge: 50, stock, qualifiesForOnboarding: qualifies }).expect(201)).body.data; }
const shipping = { name: 'New Provider', phone: '9876543210', house: '12 Test Street', city: 'Shipping City', state: 'Maharashtra', pincode: '400001' };
async function checkout(w, items, key = randomUUID()) { return (await api('post', '/service-provider/kits/orders', w.provider.accessToken, { checkoutKey: key, items, recipient: shipping }).expect(201)).body.data; }
async function pay(w, result) { const paymentId = `pay_${seq++}`, signature = signForTesting({ orderId: result.razorpay.orderId, paymentId }); await api('post', `/service-provider/kits/orders/${result.order.id}/verify-payment`, w.provider.accessToken, { razorpayPaymentId: paymentId, razorpaySignature: signature }).expect(200); return { paymentId, signature }; }
async function ship(w, id) { await api('post', `/super-admin/provider-kit-orders/${id}/fulfil`, w.admin.accessToken, { status: 'Packed' }).expect(200); const insert = (await api('get', `/super-admin/provider-kit-orders/${id}/packing-insert`, w.admin.accessToken).expect(200)).body.data; await api('post', `/super-admin/provider-kit-orders/${id}/fulfil`, w.admin.accessToken, { status: 'Shipped', courier: 'Test Courier', trackingNumber: 'REAL-123' }).expect(200); return insert.code; }
describe('provider onboarding lifecycle', () => {
  it('authenticates pending applicants but blocks work, unauthorized area access and status/category bypasses', async () => {
    const w = await fixture();
    expect(w.provider.user.providerAccess.eligible).toBe(false);
    expect((await ServiceProvider.findById(w.application.id)).specs).toEqual([]);
    expect((await api('get', '/service-provider/jobs/available', w.provider.accessToken).expect(200)).body.data).toEqual([]);
    await api('patch', '/service-provider/profile/availability', w.provider.accessToken, { availability: 'Available' }).expect(409);
    await api('put', '/service-provider/profile/profile', w.provider.accessToken, { specs: ['CCTV'] }).expect(400);
    await api('patch', `/super-admin/service-providers/${w.application.id}/status`, w.admin.accessToken, { status: 'Active' }).expect(409);
    await api('get', `/super-admin/provider-onboarding/${w.application.id}`, w.otherAsm.accessToken).expect(404);
    expect((await api('get', '/super-admin/provider-onboarding', w.asm.accessToken).expect(200)).body.data.some(p => p.id === w.application.id)).toBe(true);
    expect(await Notification.countDocuments({ recipient: w.asm.user.id, templateKey: 'provider.onboarding' })).toBeGreaterThan(0);
    expect((await api('get', `/super-admin/provider-onboarding/${w.application.id}/documents/front`, w.asm.accessToken).expect(200)).body.data.url).toMatch(/^data:application\/pdf/);
    await api('get', `/super-admin/provider-onboarding/${w.application.id}/documents/front`, w.otherAsm.accessToken).expect(404);
  });
  it('requires two approvals and paid receipt, then accepts only the two approved categories', async () => {
    const w = await fixture(); await passInterview(w); const app = await ProviderOnboarding.findOne({ serviceProvider: w.application.id });
    await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, w.asm.accessToken, { revision: app.revision, action: 'final_approve', reason: 'Not authorized' }).expect(403);
    await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, w.admin.accessToken, { revision: 0, action: 'final_approve', reason: 'Stale review' }).expect(409);
    await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, w.admin.accessToken, { revision: app.revision, action: 'final_approve', reason: 'Cannot add CCTV', approvedCategories: [String(w.categories[2]._id)] }).expect(400);
    await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, w.admin.accessToken, { revision: app.revision, action: 'final_approve', reason: 'Review passed' }).expect(200);
    expect((await ServiceProvider.findById(w.application.id)).specs).toEqual(['AC', 'Washing Machine']);
    const k = await kit(w), result = await checkout(w, [{ kit: k.id, quantity: 1 }]); expect(result.order.total).toBe(849);
    await pay(w, result); expect((await eligibilityFor(w.application.id)).eligible).toBe(false);
    const code = await ship(w, result.order.id);
    await api('post', `/super-admin/provider-kit-orders/${result.order.id}/fulfil`, w.admin.accessToken, { status: 'Delivered' }).expect(200);
    expect((await eligibilityFor(w.application.id)).eligible).toBe(false);
    await api('post', `/service-provider/kits/orders/${result.order.id}/receipt`, w.provider.accessToken, { code: 'wrong' }).expect(400);
    const received = (await api('post', `/service-provider/kits/orders/${result.order.id}/receipt`, w.provider.accessToken, { code }).expect(200)).body.data;
    expect(JSON.stringify(received)).not.toMatch(/receiptHash|receiptCodeEncrypted/);
    expect((await eligibilityFor(w.application.id, { category: 'AC' })).eligible).toBe(true);
    expect((await eligibilityFor(w.application.id, { category: 'CCTV' })).eligible).toBe(false);
    await api('patch', '/service-provider/profile/availability', w.provider.accessToken, { availability: 'Available' }).expect(200);
    for (const [category, status] of [['CCTV', 409], ['AC', 200]]) { const sr = await ServiceRequest.create({ user: w.provider.user.id, category, status: 'Assigned', serviceProvider: w.application.id, zone: w.city.name }); await api('post', `/service-provider/jobs/accept/${sr.id}`, w.provider.accessToken, {}).expect(status); }
    expect((await api('get', '/service-provider/onboarding', w.provider.accessToken).expect(200)).body.data.onboarding.interviewNotes).toBeUndefined();
  });
  it('requires a recorded super-admin interview exception', async () => {
    const w = await fixture();
    await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, w.admin.accessToken, { revision: 0, action: 'interview_reject', reason: 'No exception' }).expect(400);
    await passInterview(w, w.admin, true);
    expect((await ProviderOnboarding.findOne({ serviceProvider: w.application.id })).interviewExceptionReason).toBe('Area ASM unavailable');
  });
  it('deduplicates multi-kit checkout, payment and receipt and prevents stock or unpaid-shipment bypasses', async () => {
    const w = await fixture(); await approve(w); const optional = await kit(w, false, 2), qualifying = await kit(w, true, 1), checkoutKey = randomUUID(), items = [{ kit: optional.id, quantity: 2 }, { kit: qualifying.id, quantity: 1 }];
    const result = await checkout(w, items, checkoutKey); expect((await checkout(w, items, checkoutKey)).order.id).toBe(result.order.id);
    expect((await ProviderKit.findById(optional.id)).stock).toBe(0); expect(result.order.total).toBe(2547);
    await api('post', '/service-provider/kits/orders', w.provider.accessToken, { checkoutKey: randomUUID(), items: [{ kit: qualifying.id, quantity: 1 }], recipient: shipping }).expect(409);
    await api('post', `/super-admin/provider-kit-orders/${result.order.id}/fulfil`, w.admin.accessToken, { status: 'Packed' }).expect(409);
    const payment = await pay(w, result);
    await api('post', `/service-provider/kits/orders/${result.order.id}/verify-payment`, w.provider.accessToken, { razorpayPaymentId: payment.paymentId, razorpaySignature: payment.signature }).expect(200);
    expect((await ProviderKitOrder.findById(result.order.id)).events.filter(e => e.action === 'payment.paid')).toHaveLength(1);
    const code = await ship(w, result.order.id);
    await api('get', `/super-admin/provider-kit-orders/${result.order.id}/packing-insert`, w.admin.accessToken).expect(409);
    for (let i = 0; i < 2; i++) await api('post', `/service-provider/kits/orders/${result.order.id}/receipt`, w.provider.accessToken, { code }).expect(200);
    expect((await ProviderKitOrder.findById(result.order.id)).events.filter(e => e.action === 'receipt.verified')).toHaveLength(1);
  });
  it('releases expired stock once and does not activate after receiving an optional kit', async () => {
    const w = await fixture(); await approve(w); const k = await kit(w, false, 2), result = await checkout(w, [{ kit: k.id, quantity: 1 }]);
    await ProviderKitOrder.updateOne({ _id: result.order.id }, { expiresAt: new Date(0) }); await expireKitCheckouts(); await expireKitCheckouts(); expect((await ProviderKit.findById(k.id)).stock).toBe(2);
    const next = await checkout(w, [{ kit: k.id, quantity: 1 }]); await pay(w, next); const code = await ship(w, next.order.id);
    await api('post', `/service-provider/kits/orders/${next.order.id}/receipt`, w.provider.accessToken, { code }).expect(200);
    expect((await eligibilityFor(w.application.id)).eligible).toBe(false);
  });
  it('settles signed webhooks idempotently and rejects forged webhook signatures', async () => {
    const w = await fixture(); await approve(w); const k = await kit(w), result = await checkout(w, [{ kit: k.id, quantity: 1 }]); process.env.PROVIDER_KIT_WEBHOOK_SECRET = 'test-kit-webhook';
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_webhook', order_id: result.razorpay.orderId, amount: Math.round(result.order.total * 100), currency: 'INR', status: 'captured' } } } }), signature = createHmac('sha256', process.env.PROVIDER_KIT_WEBHOOK_SECRET).update(body).digest('hex');
    await request(server).post('/api/v1/provider-kit-payment-webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', 'bad').send(body).expect(400);
    for (let i = 0; i < 2; i++) await request(server).post('/api/v1/provider-kit-payment-webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', signature).send(body).expect(200);
    expect((await ProviderKitOrder.findById(result.order.id)).paymentStatus).toBe('Paid'); expect((await eligibilityFor(w.application.id)).eligible).toBe(false);
  });
  it('supports document/category resubmission while invalidating stale interview revisions', async () => {
    const w = await fixture();
    await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, w.asm.accessToken, { revision: 0, action: 'request_changes', reason: 'Please clarify your requested categories' }).expect(200);
    await api('post', '/service-provider/onboarding/resubmit', w.provider.accessToken, { revision: 0, categories: [String(w.categories[0]._id)] }).expect(409);
    await api('post', '/service-provider/onboarding/resubmit', w.provider.accessToken, { revision: 1, categories: [String(w.categories[0]._id)] }).expect(200);
    const app = await ProviderOnboarding.findOne({ serviceProvider: w.application.id });
    expect(app.state).toBe('ASM_REVIEW'); expect(app.requestedCategories).toHaveLength(1); expect(app.approvedCategories).toHaveLength(0);
    await api('post', `/super-admin/provider-onboarding/${w.application.id}/review`, w.asm.accessToken, { revision: 1, action: 'schedule', reason: 'Stale scheduling', interviewAt: new Date().toISOString() }).expect(409);
  });
  it('locks incorrect parcel codes, protects ownership and keeps kit products out of the customer store', async () => {
    const w = await fixture(); await approve(w); const k = await kit(w), result = await checkout(w, [{ kit: k.id, quantity: 1 }]); await pay(w, result); const code = await ship(w, result.order.id);
    const email = `other-provider-${seq++}@test.local`;
    await User.create({ role: 'service_provider', name: 'Other Provider', email, passwordHash: await hashPassword('password123') });
    const otherUser = await User.findOne({ email });
    await ServiceProvider.create({ user: otherUser._id, name: 'Other Provider', status: 'Active', specs: ['AC'] });
    const other = await login('service_provider', email);
    await api('get', `/service-provider/kits/orders/${result.order.id}`, other.accessToken).expect(404);
    for (let i = 0; i < 5; i++) await api('post', `/service-provider/kits/orders/${result.order.id}/receipt`, w.provider.accessToken, { code: 'WRONG-CODE' }).expect(400);
    await api('post', `/service-provider/kits/orders/${result.order.id}/receipt`, w.provider.accessToken, { code }).expect(429);
    const products = (await api('get', '/products', w.admin.accessToken).expect(200)).body.data;
    expect(JSON.stringify(products)).not.toContain(k.sku);
    await api('post', `/super-admin/provider-kit-orders/${result.order.id}/receipt-exception`, w.asm.accessToken, { exceptionReason: 'ASM cannot grant delivery exceptions' }).expect(403);
    await api('post', `/super-admin/provider-kit-orders/${result.order.id}/receipt-exception`, w.admin.accessToken, { exceptionReason: 'Carrier proof and provider confirmation checked; code damaged' }).expect(200);
    expect((await eligibilityFor(w.application.id)).eligible).toBe(true);
  });
  it('refunds the only qualifying kit and blocks new work without cancelling existing jobs', async () => {
    const w = await fixture(); await approve(w); const k = await kit(w), result = await checkout(w, [{ kit: k.id, quantity: 1 }]); await pay(w, result); const code = await ship(w, result.order.id);
    await api('post', `/service-provider/kits/orders/${result.order.id}/receipt`, w.provider.accessToken, { code }).expect(200);
    await api('patch', '/service-provider/profile/availability', w.provider.accessToken, { availability: 'Available' }).expect(200);
    const sr = await ServiceRequest.create({ user: w.provider.user.id, category: 'AC', status: 'Assigned', serviceProvider: w.application.id, zone: w.city.name });
    const accepted = (await api('post', `/service-provider/jobs/accept/${sr.id}`, w.provider.accessToken, {}).expect(200)).body.data;
    const refunded = (await api('post', `/super-admin/provider-kit-orders/${result.order.id}/refund`, w.admin.accessToken, { reason: 'Kit returned; full refund approved' }).expect(200)).body.data;
    expect(refunded.paymentStatus).toBe('Refunded'); expect((await eligibilityFor(w.application.id)).eligible).toBe(false);
    expect((await ServiceProvider.findById(w.application.id)).availability).toBe('Offline');
    expect((await api('get', `/service-provider/jobs/${accepted.id}`, w.provider.accessToken).expect(200)).body.data.activeStep).toBe('assigned');
  });
  it('rejects stale stock edits and concurrent overselling', async () => {
    const w = await fixture(); await approve(w); const k = await kit(w, true, 1);
    const results = await Promise.all([1, 2].map(() => api('post', '/service-provider/kits/orders', w.provider.accessToken, { checkoutKey: randomUUID(), items: [{ kit: k.id, quantity: 1 }], recipient: shipping })));
    expect(results.map(r => r.status).sort()).toEqual([201, 409]); expect((await ProviderKit.findById(k.id)).stock).toBe(0);
    await api('patch', `/super-admin/provider-kits/${k.id}`, w.admin.accessToken, { sku: k.sku, name: k.name, price: 799, stock: 1, qualifiesForOnboarding: true, expectedStockRevision: k.stockRevision }).expect(409);
  });
  it('reconciles gateway-initiated refunds once and retains eligibility through another qualifying kit', async () => {
    const w = await fixture(); await approve(w); const k = await kit(w);
    const orders = [];
    for (let i = 0; i < 2; i++) {
      const result = await checkout(w, [{ kit: k.id, quantity: 1 }]); const payment = await pay(w, result); const code = await ship(w, result.order.id);
      await api('post', `/service-provider/kits/orders/${result.order.id}/receipt`, w.provider.accessToken, { code }).expect(200);
      orders.push({ result, payment });
    }
    process.env.PROVIDER_KIT_WEBHOOK_SECRET = 'test-kit-webhook';
    for (const [index, { result, payment }] of orders.entries()) {
      const body = JSON.stringify({ event: 'refund.processed', payload: { refund: { entity: { id: `rfnd_external_${index}`, payment_id: payment.paymentId, amount: Math.round(result.order.total * 100), currency: 'INR', status: 'processed' } } } });
      const signature = createHmac('sha256', process.env.PROVIDER_KIT_WEBHOOK_SECRET).update(body).digest('hex');
      for (let retry = 0; retry < 2; retry++) await request(server).post('/api/v1/provider-kit-payment-webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', signature).send(body).expect(200);
      const saved = await ProviderKitOrder.findById(result.order.id);
      expect(saved.paymentStatus).toBe('Refunded'); expect(saved.events.filter(e => e.action === 'payment.refunded')).toHaveLength(1);
      const replay = await api('post', `/service-provider/kits/orders/${result.order.id}/verify-payment`, w.provider.accessToken, { razorpayPaymentId: payment.paymentId, razorpaySignature: payment.signature }).expect(200);
      expect(replay.body.data.paymentStatus).toBe('Refunded');
      expect((await eligibilityFor(w.application.id)).eligible).toBe(index === 0);
    }
  });
  it('records legacy exemptions without granting work access to inactive providers', async () => {
    const user = await User.create({ role: 'service_provider', name: 'Existing Provider', phone: String(seq++), passwordHash: await hashPassword('password123') });
    const p = await ServiceProvider.create({ user: user._id, name: user.name, status: 'Active', specs: ['AC'] }); await migrateLegacyProviders(); await migrateLegacyProviders();
    const saved = await ServiceProvider.findById(p._id); expect(saved.onboardingPolicyVersion).toBe(0); expect(saved.legacyExemption.recordedAt).toBeTruthy(); expect((await eligibilityFor(saved, { category: 'AC' })).eligible).toBe(true);
    await ServiceProvider.updateOne({ _id: p._id }, { status: 'Inactive' }); expect((await eligibilityFor(p._id)).eligible).toBe(false);
  });
  it('preserves known legacy applicant categories and requests correction of obsolete labels', async () => {
    const ac = await Category.create({ key: 'AC', name: 'AC' });
    const user = await User.create({ role: 'service_provider', name: 'Pending Provider', phone: String(seq++), status: 'Pending', passwordHash: await hashPassword('password123') });
    const p = await ServiceProvider.create({ user: user._id, name: user.name, status: 'Pending', specs: ['AC', 'Obsolete specialty'] });
    await migrateLegacyProviders(); await migrateLegacyProviders();
    const app = await ProviderOnboarding.findOne({ serviceProvider: p._id });
    expect(app.state).toBe('CHANGES_REQUESTED'); expect(app.requestedCategories.map(String)).toEqual([String(ac._id)]);
    expect(app.events).toHaveLength(1); expect(app.events[0].message).toContain('Obsolete specialty');
    expect((await ServiceProvider.findById(p._id)).specs).toEqual([]);
    expect((await User.findById(user._id)).status).toBe('Active'); expect((await eligibilityFor(p._id)).eligible).toBe(false);
  });
});
