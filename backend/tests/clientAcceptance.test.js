import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { seedTestCatalogue, clearCatalogue, offeringBooking } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// The client's 12 acceptance tests (NCC Master Service & Offering Catalogue
// brief), one `it` each, named as in the brief, against the seeded catalogue
// through the real HTTP API: tree → quote → booking → partner job → billing →
// payment, and the super-admin catalogue API for price changes.
// docs/master-catalogue/CLIENT-ACCEPTANCE.md maps each to its requirement.

const TEST_DB_URI = testDbUri('client_acceptance');
let app;
let admin;
let customer;
const flow = jobFlow(() => app, { phoneStart: 9300900000 });

const tree = async (key) => (await request(app).get(`/api/v1/catalog/categories/${encodeURIComponent(key)}/tree`).expect(200)).body.data;
const idOf = async (code) => String((await ServiceOffering.findOne({ code }))._id);
const quote = (lines) => request(app).post('/api/v1/catalog/quote').send({ lines });
const quoteOne = async (code, quantity = 1) => (await quote([{ offeringId: await idOf(code), quantity }]).expect(200)).body.data;
const book = async (code, options = {}) =>
  request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${customer.token}`)
    .send(await offeringBooking(code, { userId: String(customer.user._id), ...options }));
const adminApi = (method, path, body) =>
  request(app)[method](`/api/v1/super-admin/catalogue${path}`).set('Authorization', `Bearer ${admin}`).send(body);

/** Books, completes and collects a job; returns what the customer paid and the partner earned. */
async function completeJob(code, { specs, bookingOptions = {} }) {
  const job = await flow.jobToBilling(code, { specs, bookingOptions });
  const { billing, payment } = await flow.billAndCollect(job);
  return { job, billing, payment };
}

const wall = { requiredInfo: [{ key: 'wall_type', value: 'Concrete' }] };
const fanType = { requiredInfo: [{ key: 'fan_type', value: 'Ceiling' }] };

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp().listen(0);
});

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await clearCatalogue();
  await Promise.all([User, ServiceProvider, Booking, ServiceRequest, Job].map((m) => m.deleteMany({})));
  await seedTestCatalogue();
  await User.create({ role: ROLES.SUPER_ADMIN, email: 'acceptance-admin@test.dev', name: 'Admin', passwordHash: await hashPassword('password123') });
  admin = await flow.loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: 'acceptance-admin@test.dev' });
  customer = await flow.customer();
});

describe('NCC client acceptance tests', () => {
  it('Test 1: Split AC Installation → ₹1,499', async () => {
    const ac = await tree('AC');
    const split = ac.productTypes.find((pt) => pt.slug === 'split');
    const ton15 = split.variants.find((v) => v.label === '1.5 Ton');
    const offering = ac.offerings.find((o) => o.productTypeId === split.id && o.variantId === ton15.id && o.code.endsWith('INSTALL'));
    expect(offering).toMatchObject({ code: 'AC-SPLIT-15T-INSTALL', customerPrice: 1499 });

    const q = await quoteOne('AC-SPLIT-15T-INSTALL');
    expect(q.lines[0].unitPrice).toBe(1499);
    expect(q.totals.final).toBe(1768.82);

    const { billing, payment } = await completeJob('AC-SPLIT-15T-INSTALL', { specs: ['AC'], bookingOptions: wall });
    expect(payment.amount).toBe(1768.82);
    expect(billing.serviceProviderEarnings).toBe(900);
  });

  it('Test 2: Window AC Installation → ₹599', async () => {
    const q = await quoteOne('AC-WINDOW-INSTALL');
    expect([q.lines[0].unitPrice, q.totals.final]).toEqual([599, 706.82]);
    const { billing } = await completeJob('AC-WINDOW-INSTALL', { specs: ['AC'] });
    expect(billing).toMatchObject({ total: 706.82, serviceProviderEarnings: 350 });
  });

  it('Test 3: LED TV 32" Installation → ₹349', async () => {
    const q = await quoteOne('TV-LED-32-INSTALL');
    expect([q.lines[0].unitPrice, q.totals.final]).toEqual([349, 411.82]);
    const { billing } = await completeJob('TV-LED-32-INSTALL', { specs: ['TV'] });
    expect(billing).toMatchObject({ total: 411.82, serviceProviderEarnings: 200 });
  });

  it('Test 4: LED TV 55–65" Installation → ₹799 (₹349 never appears)', async () => {
    const q = await quoteOne('TV-LED-55-65-INSTALL');
    expect([q.lines[0].unitPrice, q.totals.final]).toEqual([799, 942.82]);
    const res = await book('TV-LED-55-65-INSTALL');
    expect(res.status).toBe(201);
    expect(res.body.data.booking.commercial).toMatchObject({ unitPrice: 799, variant: { label: '55–65 inch' } });
    expect(JSON.stringify(q)).not.toMatch(/\b349\b/);
    expect(JSON.stringify(res.body.data.booking)).not.toMatch(/\b349\b/);
  });

  it('Test 5: Fan Installation — standalone, no product', async () => {
    const elec = await tree('Electrician');
    expect(elec.productTypes).toEqual([]);
    const fan = elec.standaloneServices.find((s) => s.slug === 'fan_installation');
    expect(fan.options).toEqual([]);
    expect(elec.offerings.find((o) => o.code === 'ELEC-FAN-INSTALL')).toMatchObject({ customerPrice: 299, productTypeId: null });

    const res = await book('ELEC-FAN-INSTALL', fanType);
    expect(res.status).toBe(201);
    expect(res.body.data.booking.commercial).toMatchObject({ bookingType: 'STANDALONE', productType: null, unitPrice: 299 });
  });

  it('Test 6: Water Tank Cleaning — optional tank size', async () => {
    const cleaning = await tree('Water Tank Sump Cleaning');
    const tank = cleaning.standaloneServices.find((s) => s.slug === 'water_tank_cleaning');
    const prices = tank.options.map((opt) => cleaning.offerings.find((o) => o.variantId === opt.id).customerPrice);
    expect(prices).toEqual([499, 699, 999, 1499]);

    const res = await book('CLEAN-TANK-1000L');
    expect(res.status).toBe(201);
    expect(res.body.data.booking.commercial).toMatchObject({ unitPrice: 699, variant: { label: '501–1000 L' } });
  });

  it('Test 7: Electrician Consultation — standalone', async () => {
    const q = await quoteOne('ELEC-CONSULT');
    expect(q.lines[0]).toMatchObject({ unitPrice: 199, quantity: 1 });
    const two = await quote([{ offeringId: await idOf('ELEC-CONSULT'), quantity: 2 }]);
    expect([two.status, two.body.error.code]).toEqual([400, 'QUANTITY_OUT_OF_RANGE']);
    expect((await book('ELEC-CONSULT')).status).toBe(201);
  });

  it('Test 8: Customer price change ≠ payout change', async () => {
    const id = await idOf('TV-LED-55-65-INSTALL');
    const changed = await adminApi('post', `/offerings/${id}/rates`, { customerPrice: 899, reason: 'Festive pricing' });
    expect(changed.status).toBe(201);

    expect((await quoteOne('TV-LED-55-65-INSTALL')).lines[0].unitPrice).toBe(899);
    const { billing } = await completeJob('TV-LED-55-65-INSTALL', { specs: ['TV'] });
    expect(billing).toMatchObject({ total: 1060.82, serviceProviderEarnings: 450 });

    const history = (await adminApi('get', `/offerings/${id}/rates`).expect(200)).body.data;
    const latest = history.find((r) => r.version === 2);
    expect(latest).toMatchObject({ customerPrice: 899, spPayout: 450, reason: 'Festive pricing' });
    expect(latest.changes).toEqual([{ field: 'customerPrice', from: 799, to: 899 }]);
  });

  it('Test 9: Quantity × price and × payout', async () => {
    const q = await quoteOne('ELEC-FAN-INSTALL', 2);
    expect(q.lines[0]).toMatchObject({ quantity: 2, baseAmount: 598 });
    expect(q.totals.final).toBe(705.64);
    const { billing, payment } = await completeJob('ELEC-FAN-INSTALL', { specs: ['Electrician'], bookingOptions: { quantity: 2, ...fanType } });
    expect(payment.amount).toBe(705.64);
    expect(billing.serviceProviderEarnings).toBe(360);
  });

  it('Test 10: Same final price Service Selection → Payment', async () => {
    const q = await quoteOne('AC-SPLIT-15T-INSTALL');
    const { job, billing, payment } = await completeJob('AC-SPLIT-15T-INSTALL', { specs: ['AC'], bookingOptions: wall });
    const detail = (await request(app).get(`/api/v1/bookings/${job.booking.id}`).set('Authorization', `Bearer ${job.cust.token}`).expect(200)).body.data;
    const amounts = [q.totals.final, job.booking.totalPrice, job.booking.commercial.finalAmount, detail.totalPrice, detail.commercial.finalAmount, billing.total, payment.amount];
    expect(new Set(amounts)).toEqual(new Set([1768.82]));
  });

  it('Test 11: Old booking keeps original price & payout', async () => {
    const first = await book('TV-LED-55-65-INSTALL');
    await adminApi('post', `/offerings/${await idOf('TV-LED-55-65-INSTALL')}/rates`, { customerPrice: 899, reason: 'Festive pricing' }).expect(201);

    const old = (await request(app).get(`/api/v1/bookings/${first.body.data.booking.id}`).set('Authorization', `Bearer ${customer.token}`).expect(200)).body.data;
    expect(old).toMatchObject({ totalPrice: 942.82, commercial: { unitPrice: 799, rate: { version: 1 } } });
    expect((await Booking.findById(first.body.data.booking.id)).commercial.spPayoutTotal).toBe(450);
  });

  it('Test 12: Unconfigured combination cannot be booked', async () => {
    // Never configured: Window AC has no Gas Refilling offering, so the option doesn't exist.
    const ac = await tree('AC');
    const window = ac.productTypes.find((pt) => pt.slug === 'window');
    const gas = ac.services.find((s) => s.slug === 'gas_refilling');
    expect(ac.offerings.some((o) => o.productTypeId === window.id && o.serviceId === gas.id)).toBe(false);

    // Configured, then switched off by the admin: gone from the tree, refused by quote and booking.
    const id = await idOf('AC-SPLIT-GAS');
    const body = await offeringBooking('AC-SPLIT-GAS', { userId: String(customer.user._id), variant: '1.5 Ton' });
    await adminApi('patch', `/offerings/${id}/status`, { isActive: false }).expect(200);
    expect((await tree('AC')).offerings.some((o) => o.code === 'AC-SPLIT-GAS')).toBe(false);
    const q = await quote([{ offeringId: id, variantId: body.variantId, quantity: 1 }]);
    expect([q.status, q.body.error.code]).toEqual([400, 'OFFERING_NOT_BOOKABLE']);
    const b = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${customer.token}`).send(body);
    expect([b.status, b.body.error.code]).toEqual([400, 'OFFERING_NOT_BOOKABLE']);
  });
});
