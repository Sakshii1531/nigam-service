import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { Variant } from '../src/modules/catalog/variant.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { sweepExpiredAssignments } from '../src/modules/service-requests/serviceRequest.service.js';
import { expireStaleSearches, SEARCH_END_MESSAGES } from '../src/modules/booking/booking.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { seedSimpleOffering, seedTestCatalogue, offeringBooking, clearCatalogue } from './helpers/catalogue.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { createRateVersion } from '../src/modules/catalog/rateWriter.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('booking');

let app;


async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

/** The AC category with one simple ₹299 offering (GST 0) — for booking-flow tests that aren't about pricing. */
async function seedCatalog() {
  const category = await Category.create({ key: 'AC', name: 'AC', color: '#0D47A1' });
  await seedSimpleOffering({ categoryKey: 'AC', code: 'TEST-REPAIR', price: 299, payout: 150 });
  return category;
}

async function seedCustomer(phone = '9200000001') {
  await User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('password123') });
  return loginAndVerify({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
}

async function seedServiceProvider({ phone = '9300000001', specs = ['AC'], availability = 'Available' } = {}) {
  const user = await User.create({
    role: ROLES.SERVICE_PROVIDER,
    phone,
    name: 'Test Service Provider',
    passwordHash: await hashPassword('password123'),
  });
  const serviceProvider = await ServiceProvider.create({ user: user._id, name: 'Test Service Provider', phone, status: 'Active', availability, specs });
  const token = await loginAndVerify({ role: ROLES.SERVICE_PROVIDER, identifier: phone, password: 'password123' });
  return { serviceProvider, token };
}

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
  await Promise.all([
    User.deleteMany({}),
    ServiceProvider.deleteMany({}),
    Category.deleteMany({}),
    ProductType.deleteMany({}),
    Booking.deleteMany({}),
    ServiceRequest.deleteMany({}),
  ]);
});

describe('POST /bookings — full booking -> service-request -> auto-assign flow', () => {
  it('creates a booking with a server-priced total, an auto-assigned serviceProvider, and a linked ServiceRequest at status Assigned', async () => {
    await seedCatalog();
    const { serviceProvider } = await seedServiceProvider();
    const token = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(await offeringBooking('TEST-REPAIR', { quantity: 2 }))
      .expect(201);

    const { booking, serviceRequest, serviceProvider: assigned } = res.body.data;
    expect(booking.totalPrice).toBe(598); // 299 * 2, priced server-side by the catalogue engine
    expect(booking.humanId).toMatch(/^NCC-\d{6}-\d{4}$/);
    expect(booking.serviceProvider).toBe(serviceProvider.id);
    expect(assigned.name).toBe('Test Service Provider');

    expect(serviceRequest.status).toBe('Assigned');
    expect(serviceRequest.timeline.map((t) => t.stepLabel)).toEqual(['New', 'Assigned']);
    expect(serviceRequest.humanId).toMatch(/^SR-\d{4}$/);
    expect(serviceRequest.booking).toBe(booking.id);
  });

  it('sweeps an unanswered assignment older than the response window back into the pool', async () => {
    await seedCatalog();
    const { serviceProvider } = await seedServiceProvider();
    const token = await seedCustomer();
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(await offeringBooking('TEST-REPAIR'))
      .expect(201);
    const srId = res.body.data.serviceRequest.id;

    // Fresh assignment: untouched.
    expect((await sweepExpiredAssignments()).passedOn).toBe(0);

    await ServiceRequest.updateOne({ _id: srId }, { assignedAt: new Date(Date.now() - 2 * 60 * 1000) });
    const result = await sweepExpiredAssignments();
    expect(result.passedOn).toBe(1);

    const sr = await ServiceRequest.findById(srId);
    expect(sr.declinedBy.map(String)).toContain(String(serviceProvider._id));
    expect(String(sr.serviceProvider || '')).not.toBe(String(serviceProvider._id));
  });

  it('creates the booking with no serviceProvider assigned (and ServiceRequest stays "New") when none are available', async () => {
    await seedCatalog();
    const token = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(await offeringBooking('TEST-REPAIR'))
      .expect(201);

    expect(res.body.data.booking.serviceProvider).toBeNull();
    expect(res.body.data.serviceRequest.status).toBe('New');
    expect(res.body.data.serviceProvider).toBeNull();
  });

  it('rejects an unauthenticated request with 401', async () => {
    await request(app).post('/api/v1/bookings').send({ offeringId: '64b000000000000000000001', expectedFinalAmount: 1 }).expect(401);
  });

  it('rejects a non-customer role (e.g. serviceProvider) with 403', async () => {
    await seedCatalog();
    const { token } = await seedServiceProvider();
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(await offeringBooking('TEST-REPAIR'))
      .expect(403);
  });
});

// The booking engine against the real seeded catalogue — the client's test
// cases (docs/master-catalogue/CLIENT-ACCEPTANCE.md) at API level.
describe('POST /bookings — master catalogue booking engine', () => {
  let token;
  let userId;

  beforeEach(async () => {
    await seedTestCatalogue();
    token = await seedCustomer('9200000099');
    userId = String((await User.findOne({ phone: '9200000099' }))._id);
  });

  const book = async (body) => request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(body);
  const wallType = { requiredInfo: [{ key: 'wall_type', value: 'Brick' }] };
  const fanType = { requiredInfo: [{ key: 'fan_type', value: 'Ceiling' }] };

  it.each([
    ['Test 1: Split AC 1.5 Ton Installation', 'AC-SPLIT-15T-INSTALL', wallType, 1499, 1768.82, '1.5 Ton', 900],
    ['Test 2: Window AC Installation', 'AC-WINDOW-INSTALL', {}, 599, 706.82, null, 350],
    ['Test 3: LED TV 32" Installation', 'TV-LED-32-INSTALL', {}, 349, 411.82, '32 inch', 200],
    ['Test 4: LED TV 55–65" Installation', 'TV-LED-55-65-INSTALL', {}, 799, 942.82, '55–65 inch', 450],
  ])('%s', async (_label, code, extra, unitPrice, final, variantLabel, payout) => {
    const res = await book(await offeringBooking(code, extra));
    expect(res.status).toBe(201);
    const { booking } = res.body.data;
    expect(booking.totalPrice).toBe(final);
    expect(booking.commercial).toMatchObject({ offeringCode: code, unitPrice, gstPercent: 18, finalAmount: final });
    expect(booking.commercial.variant?.label ?? null).toBe(variantLabel);
    expect(booking.commercial.spPayoutTotal).toBeUndefined(); // never in a customer response

    const stored = await Booking.findById(booking.id);
    expect(stored.commercial.spPayoutTotal).toBe(payout);
  });

  it('Test 5: Fan Installation is standalone — no product type needed', async () => {
    const res = await book(await offeringBooking('ELEC-FAN-INSTALL', fanType));
    expect(res.status).toBe(201);
    expect(res.body.data.booking.commercial).toMatchObject({ bookingType: 'STANDALONE', productType: null, service: { name: 'Fan Installation' } });
    expect(res.body.data.booking.requiredInfo).toEqual([{ key: 'fan_type', label: 'Fan type', value: 'Ceiling' }]);
  });

  it('Test 6: Water Tank Cleaning stores the chosen tank size; a wrong size is refused', async () => {
    const res = await book(await offeringBooking('CLEAN-TANK-1000L'));
    expect(res.status).toBe(201);
    expect(res.body.data.booking.commercial.variant.label).toBe('501–1000 L');
    expect(res.body.data.booking.totalPrice).toBe(824.82);

    const wrong = await offeringBooking('CLEAN-TANK-1000L');
    wrong.variantId = String((await Variant.findOne({ label: 'Up to 500 L' }))._id);
    const bad = await book(wrong);
    expect([bad.status, bad.body.error.code]).toEqual([400, 'VARIANT_MISMATCH']);
  });

  it('Test 7: Electrician Consultation is one visit — quantity 2 is refused', async () => {
    const two = await offeringBooking('ELEC-CONSULT');
    two.quantity = 2;
    const res = await book(two);
    expect([res.status, res.body.error.code]).toEqual([400, 'QUANTITY_OUT_OF_RANGE']);
    expect((await book(await offeringBooking('ELEC-CONSULT'))).status).toBe(201);
  });

  it('Test 9: quantity multiplies price and payout', async () => {
    const res = await book(await offeringBooking('ELEC-FAN-INSTALL', { quantity: 2, ...fanType }));
    expect(res.body.data.booking.commercial).toMatchObject({ quantity: 2, baseAmount: 598, finalAmount: 705.64 });
    const stored = await Booking.findById(res.body.data.booking.id);
    expect(stored.commercial.spPayoutTotal).toBe(360);
  });

  it('Test 10 (API): quote total = booking total = snapshot final', async () => {
    const offering = await ServiceOffering.findOne({ code: 'TV-LED-55-65-INSTALL' });
    const quote = await request(app).post('/api/v1/catalog/quote').send({ lines: [{ offeringId: String(offering._id), quantity: 2 }] });
    const res = await book({ offeringId: String(offering._id), quantity: 2, expectedFinalAmount: quote.body.data.totals.final });
    expect(res.status).toBe(201);
    expect(res.body.data.booking.totalPrice).toBe(quote.body.data.totals.final);
    expect(res.body.data.booking.commercial.finalAmount).toBe(quote.body.data.totals.final);
  });

  it('Test 11: an old booking keeps its price, payout and rate version after a price change', async () => {
    const first = await book(await offeringBooking('TV-LED-55-65-INSTALL'));
    const offering = await ServiceOffering.findOne({ code: 'TV-LED-55-65-INSTALL' });
    await createRateVersion(offering._id, { customerPrice: 89900 }, { reason: 'Festive' });

    const old = await request(app).get(`/api/v1/bookings/${first.body.data.booking.id}`).set('Authorization', `Bearer ${token}`);
    expect(old.body.data.totalPrice).toBe(942.82);
    expect(old.body.data.commercial.rate.version).toBe(1);
    expect((await Booking.findById(first.body.data.booking.id)).commercial.spPayoutTotal).toBe(450);

    const second = await book(await offeringBooking('TV-LED-55-65-INSTALL'));
    expect(second.body.data.booking.totalPrice).toBe(1060.82);
    expect(second.body.data.booking.commercial.rate.version).toBe(2);
    expect((await Booking.findById(second.body.data.booking.id)).commercial.spPayoutTotal).toBe(450);
  });

  it('Test 12: a deactivated or unconfigured offering cannot be booked; the old payload is refused', async () => {
    const body = await offeringBooking('AC-WINDOW-UNINSTALL');
    await ServiceOffering.updateOne({ code: 'AC-WINDOW-UNINSTALL' }, { isActive: false });
    const res = await book(body);
    expect([res.status, res.body.error.code]).toEqual([400, 'OFFERING_NOT_BOOKABLE']);

    const unknown = await book({ offeringId: '64b000000000000000000001', expectedFinalAmount: 1 });
    expect(unknown.body.error.code).toBe('OFFERING_NOT_BOOKABLE');

    const legacy = await book({ category: 'AC', serviceSlug: 'repair' });
    expect(legacy.status).toBe(400);
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('ignores nothing silently — a client-supplied price is rejected', async () => {
    const res = await book({ ...(await offeringBooking('AC-WINDOW-INSTALL')), totalPrice: 1 });
    expect(res.status).toBe(400);
  });

  it('refuses a stale price with 409 PRICE_CHANGED and the fresh quote', async () => {
    const res = await book({ ...(await offeringBooking('AC-WINDOW-INSTALL')), expectedFinalAmount: 600 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PRICE_CHANGED');
    expect(res.body.error.details.quote.totals.final).toBe(706.82);
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('a variant-agnostic offering needs the customer\'s size and records it', async () => {
    const res = await book(await offeringBooking('AC-SPLIT-UNINSTALL', { variant: '2 Ton' }));
    expect(res.status).toBe(201);
    expect(res.body.data.booking.commercial.variant.label).toBe('2 Ton');
    expect(res.body.data.booking.productType).toBe('Split AC');
  });

  it('required info: a missing answer or an invalid choice is refused', async () => {
    const missing = await book(await offeringBooking('AC-SPLIT-15T-INSTALL'));
    expect([missing.status, missing.body.error.message]).toEqual([400, 'Please answer: Wall type']);
    const invalid = await book(await offeringBooking('AC-SPLIT-15T-INSTALL', { requiredInfo: [{ key: 'wall_type', value: 'Glass' }] }));
    expect(invalid.status).toBe(400);
  });

  it('an ASAP booking is express: the fee is charged, and a non-express offering refuses ASAP', async () => {
    const fan = await book(await offeringBooking('ELEC-FAN-INSTALL', { ...fanType, timeGroup: 'ASAP' }));
    expect(fan.status).toBe(201);
    expect(fan.body.data.booking.commercial).toMatchObject({ isExpress: true, expressFee: 99, finalAmount: 469.64 });
    expect((await Booking.findById(fan.body.data.booking.id)).commercial.spPayoutTotal).toBe(230);

    const consult = await offeringBooking('ELEC-CONSULT');
    const res = await book({ ...consult, timeGroup: 'ASAP' });
    expect([res.status, res.body.error.code]).toEqual([400, 'EXPRESS_NOT_AVAILABLE']);
  });

  it('a warranty-covered booking costs the customer nothing but keeps the partner payout', async () => {
    const purchaseDate = new Date(Date.now() - 30 * 86400000).toISOString();
    const res = await book(await offeringBooking('AC-WINDOW-INSTALL', { purchaseDate, coverageType: 'Brand Warranty' }));
    expect(res.status).toBe(201);
    expect(res.body.data.booking.totalPrice).toBe(0);
    expect(res.body.data.booking.commercial.coverage).toEqual({ type: 'Brand Warranty', amount: 599 });
    expect((await Booking.findById(res.body.data.booking.id)).commercial.spPayoutTotal).toBe(350);
  });

  it('redeems wallet coins after GST and refunds nothing on success', async () => {
    await User.updateOne({ _id: userId }, { walletCoins: 1000 });
    const res = await book(await offeringBooking('AC-WINDOW-INSTALL', { useCoins: true, userId }));
    expect(res.status).toBe(201);
    expect(res.body.data.booking.commercial.coinsApplied).toBe(100);
    expect(res.body.data.booking.totalPrice).toBe(706.82);
    expect((await User.findById(userId)).walletCoins).toBe(0);
  });

  it('advance mode takes the platform share of the server total', async () => {
    const res = await book(await offeringBooking('AC-WINDOW-INSTALL', { paymentMode: 'advance' }));
    expect(res.body.data.booking.advanceAmount).toBe(141.36); // 20% of 706.82
  });
});

describe('GET /bookings, GET /bookings/:id — ownership', () => {
  it('lists only the requesting customer\'s own bookings', async () => {
    await seedCatalog();
    await seedServiceProvider();
    const tokenA = await seedCustomer('9200000002');
    const tokenB = await seedCustomer('9200000003');

    await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${tokenA}`).send(await offeringBooking('TEST-REPAIR'));

    const resA = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(resA.body.data).toHaveLength(1);

    const resB = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${tokenB}`).expect(200);
    expect(resB.body.data).toHaveLength(0);
  });

  it('rejects viewing another customer\'s booking with 403', async () => {
    await seedCatalog();
    await seedServiceProvider();
    const tokenA = await seedCustomer('9200000004');
    const tokenB = await seedCustomer('9200000005');

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(await offeringBooking('TEST-REPAIR'));

    await request(app)
      .get(`/api/v1/bookings/${createRes.body.data.booking.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });
});

describe('POST /bookings/:id/cancel', () => {
  it('cancels the booking and its linked ServiceRequest', async () => {
    await seedCatalog();
    await seedServiceProvider();
    const token = await seedCustomer('9200000006');

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(await offeringBooking('TEST-REPAIR'));
    const { booking, serviceRequest } = createRes.body.data;

    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cancelRes.body.data.status).toBe('Cancelled');

    const srRes = await request(app).get(`/api/v1/service-requests/${serviceRequest.id}`).set('Authorization', `Bearer ${token}`);
    expect(srRes.body.data.status).toBe('Cancelled');
  });
});

describe('service request status transitions — server-side state machine', () => {
  async function createAssignedBooking() {
    await seedCatalog();
    const { token: serviceProviderToken } = await seedServiceProvider({ phone: '9300000002' });
    const custToken = await seedCustomer('9200000007');
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${custToken}`)
      .send(await offeringBooking('TEST-REPAIR'));
    return { srId: createRes.body.data.serviceRequest.id, serviceProviderToken, custToken };
  }

  it('lets the assigned serviceProvider make a valid transition and records it in the timeline', async () => {
    const { srId, serviceProviderToken } = await createAssignedBooking();

    const res = await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${serviceProviderToken}`)
      .send({ status: 'Engineer Accepted' })
      .expect(200);

    expect(res.body.data.status).toBe('Engineer Accepted');
    expect(res.body.data.timeline.map((t) => t.stepLabel)).toEqual(['New', 'Assigned', 'Engineer Accepted']);
  });

  it('rejects an out-of-order transition (skipping steps) with 400', async () => {
    const { srId, serviceProviderToken } = await createAssignedBooking();

    await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${serviceProviderToken}`)
      .send({ status: 'Closed' })
      .expect(400);
  });

  it('rejects a transition attempt from the customer with 403', async () => {
    const { srId, custToken } = await createAssignedBooking();

    await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ status: 'Engineer Accepted' })
      .expect(403);
  });

  it('rejects a transition attempt from a serviceProvider who is not the one assigned', async () => {
    const { srId } = await createAssignedBooking();
    const { token: otherTechToken } = await seedServiceProvider({ phone: '9300000003' });

    await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${otherTechToken}`)
      .send({ status: 'Engineer Accepted' })
      .expect(403);
  });

  it('walks a request through the full happy-path lifecycle to Closed', async () => {
    const { srId, serviceProviderToken } = await createAssignedBooking();
    const steps = [
      'Engineer Accepted',
      'Visit Scheduled',
      'Engineer Reached',
      'Diagnosis Done',
      'Repair Completed',
      'Customer Confirmation',
      'Closed',
    ];

    for (const status of steps) {
      const res = await request(app)
        .patch(`/api/v1/service-requests/${srId}/status`)
        .set('Authorization', `Bearer ${serviceProviderToken}`)
        .send({ status });
      expect(res.status).toBe(200);
    }

    const final = await request(app).get(`/api/v1/service-requests/${srId}`).set('Authorization', `Bearer ${serviceProviderToken}`);
    expect(final.body.data.status).toBe('Closed');
    expect(final.body.data.timeline).toHaveLength(9); // New, Assigned, + the 7 steps above

    // Closed is terminal — no further transitions allowed.
    await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${serviceProviderToken}`)
      .send({ status: 'New' })
      .expect(400);
  });
});

describe('manual assignment from the super-admin console', () => {
  async function seedSuperAdmin() {
    const email = 'assign-admin@test.com';
    await User.create({ role: ROLES.SUPER_ADMIN, name: 'Super Admin', email, passwordHash: await hashPassword('password123'), status: 'Active' });
    return loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: email, password: 'password123' });
  }

  // A request with no service provider: created directly rather than through /bookings,
  // which auto-assigns on the way in.
  async function seedUnassignedRequest() {
    const customer = await User.create({
      role: ROLES.CUSTOMER, phone: '9200000031', name: 'Unassigned Customer', passwordHash: await hashPassword('password123'),
    });
    return ServiceRequest.create({ user: customer._id, category: 'AC', description: 'Not cooling' });
  }

  it('ranks candidates and assigns the chosen one, moving the request to Assigned', async () => {
    const adminToken = await seedSuperAdmin();
    const { serviceProvider } = await seedServiceProvider({ phone: '9300000031' });
    const sr = await seedUnassignedRequest();

    const suggestRes = await request(app)
      .get(`/api/v1/service-requests/${sr.id}/service-provider-suggestions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(suggestRes.body.data[0]).toMatchObject({ id: serviceProvider.id, name: 'Test Service Provider' });
    expect(typeof suggestRes.body.data[0].score).toBe('number');
    expect(suggestRes.body.data[0].breakdown).toBeDefined();

    const assignRes = await request(app)
      .patch(`/api/v1/service-requests/${sr.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceProvider: serviceProvider.id })
      .expect(200);
    expect(assignRes.body.data.status).toBe('Assigned');
    expect(assignRes.body.data.serviceProvider.name).toBe('Test Service Provider');
    expect(assignRes.body.data.timeline.map((t) => t.stepLabel)).toContain('Assigned');
  });

  it('falls back to the weighted engine when no serviceProvider is named', async () => {
    const adminToken = await seedSuperAdmin();
    const { serviceProvider } = await seedServiceProvider({ phone: '9300000032' });
    const sr = await seedUnassignedRequest();

    const res = await request(app)
      .patch(`/api/v1/service-requests/${sr.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    expect(String(res.body.data.serviceProvider.id)).toBe(String(serviceProvider.id));
  });

  it('409s when there is nobody available to auto-assign to', async () => {
    const adminToken = await seedSuperAdmin();
    const sr = await seedUnassignedRequest();

    const res = await request(app)
      .patch(`/api/v1/service-requests/${sr.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(409);
    expect(res.body.error.message).toMatch(/No available serviceProvider/);
  });

  it('refuses to re-route a request that is already underway', async () => {
    const adminToken = await seedSuperAdmin();
    const { serviceProvider } = await seedServiceProvider({ phone: '9300000033' });
    const sr = await seedUnassignedRequest();
    sr.status = 'Engineer Reached';
    await sr.save();

    const res = await request(app)
      .patch(`/api/v1/service-requests/${sr.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceProvider: serviceProvider.id })
      .expect(409);
    expect(res.body.error.message).toMatch(/Engineer Reached/);
  });

  it('rejects an inactive serviceProvider and a non-super-admin caller', async () => {
    const adminToken = await seedSuperAdmin();
    const { serviceProvider } = await seedServiceProvider({ phone: '9300000034' });
    const custToken = await seedCustomer('9200000034');
    const sr = await seedUnassignedRequest();

    await ServiceProvider.findByIdAndUpdate(serviceProvider.id, { status: 'Inactive' });
    const res = await request(app)
      .patch(`/api/v1/service-requests/${sr.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceProvider: serviceProvider.id })
      .expect(409);
    expect(res.body.error.message).toMatch(/not Active/);

    await request(app)
      .patch(`/api/v1/service-requests/${sr.id}/assign`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({})
      .expect(403);
    await request(app).get(`/api/v1/service-requests/${sr.id}/service-provider-suggestions`).expect(401);
  });
});

describe('15-minute search cut-off', () => {
  const past = () => new Date(Date.now() - 1000);

  async function bookIn(city, token) {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(await offeringBooking('TEST-REPAIR', { address: { house: '1', city, pincode: '400001' } }))
      .expect(201);
    return res.body.data;
  }

  it('starts every booking with a 15-minute search window', async () => {
    await seedCatalog();
    const token = await seedCustomer();
    const { booking } = await bookIn('Mumbai', token);
    const minutes = (new Date(booking.searchExpiresAt).getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(14.5);
    expect(minutes).toBeLessThanOrEqual(15);
    expect((await expireStaleSearches()).expired).toBe(0);
  });

  it('cancels with NO_PROVIDERS_NEARBY when nobody serves the customer\'s area', async () => {
    await seedCatalog();
    const token = await seedCustomer();
    const { booking, serviceRequest } = await bookIn('Mumbai', token);
    await Booking.updateOne({ _id: booking.id }, { searchExpiresAt: past() });

    expect((await expireStaleSearches()).expired).toBe(1);

    const saved = await Booking.findById(booking.id);
    expect(saved.status).toBe('Cancelled');
    expect(saved.searchEndReason).toBe('NO_PROVIDERS_NEARBY');
    expect(saved.cancellationReason).toBe(SEARCH_END_MESSAGES.NO_PROVIDERS_NEARBY);
    expect((await ServiceRequest.findById(serviceRequest.id)).status).toBe('Cancelled');

    // The customer app reads the reason from the booking.
    const res = await request(app).get(`/api/v1/bookings/${booking.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.searchEndReason).toBe('NO_PROVIDERS_NEARBY');
  });

  it('cancels with PROVIDERS_NOT_ACCEPTING when providers are in the area but none accepted', async () => {
    await seedCatalog();
    const { serviceProvider } = await seedServiceProvider({ availability: 'Offline' });
    await ServiceProvider.updateOne({ _id: serviceProvider._id }, { serviceCityName: 'Mumbai' });
    const token = await seedCustomer();
    const { booking } = await bookIn('Mumbai', token);
    await Booking.updateOne({ _id: booking.id }, { searchExpiresAt: past() });

    await expireStaleSearches();
    const saved = await Booking.findById(booking.id);
    expect(saved.status).toBe('Cancelled');
    expect(saved.searchEndReason).toBe('PROVIDERS_NOT_ACCEPTING');
  });

  it('treats a job that was offered to someone (and declined) as providers not accepting', async () => {
    await seedCatalog();
    const { serviceProvider, token: spToken } = await seedServiceProvider();
    const token = await seedCustomer();
    const { booking, serviceRequest } = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(await offeringBooking('TEST-REPAIR'))
      .expect(201)
      .then((r) => r.body.data);
    await request(app).post(`/api/v1/service-provider/jobs/reject/${serviceRequest.id}`).set('Authorization', `Bearer ${spToken}`).expect(200);
    await ServiceProvider.deleteOne({ _id: serviceProvider._id }); // nobody left nearby
    await Booking.updateOne({ _id: booking.id }, { searchExpiresAt: past() });

    await expireStaleSearches();
    expect((await Booking.findById(booking.id)).searchEndReason).toBe('PROVIDERS_NOT_ACCEPTING');
  });

  it('leaves accepted bookings alone', async () => {
    await seedCatalog();
    const { token: spToken } = await seedServiceProvider();
    const token = await seedCustomer();
    const { booking, serviceRequest } = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(await offeringBooking('TEST-REPAIR'))
      .expect(201)
      .then((r) => r.body.data);
    await request(app).post(`/api/v1/service-provider/jobs/accept/${serviceRequest.id}`).set('Authorization', `Bearer ${spToken}`).send({}).expect(200);

    const accepted = await Booking.findById(booking.id);
    expect(accepted.searchExpiresAt).toBeNull();
    await Booking.updateOne({ _id: booking.id }, { searchExpiresAt: past() }); // even if a stale clock lingered
    expect((await expireStaleSearches()).expired).toBe(0);
    expect((await Booking.findById(booking.id)).status).not.toBe('Cancelled');
  });
});
