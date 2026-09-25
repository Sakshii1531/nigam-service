import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { Variant } from '../src/modules/catalog/variant.model.js';
import { CatalogService } from '../src/modules/catalog/catalogService.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { OfferingRate } from '../src/modules/catalog/offeringRate.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { seedTestCatalogue } from './helpers/catalogue.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('catalog_admin');
const BASE = '/api/v1/super-admin/catalogue';

let app;
let adminToken;
let customerToken;

async function login(role, identifier) {
  await User.create({
    role,
    ...(identifier.includes('@') ? { email: identifier } : { phone: identifier }),
    name: role === ROLES.SUPER_ADMIN ? 'Admin Rahul' : 'Customer',
    passwordHash: await hashPassword('password123'),
  });
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password: 'password123' }).expect(200);
  const res = await request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ role, identifier, code: readOtpCode(identifier) })
    .expect(200);
  return res.body.data.accessToken;
}

const as = (token) => ({
  get: (path) => request(app).get(`${BASE}${path}`).set('Authorization', `Bearer ${token}`),
  post: (path, body) => request(app).post(`${BASE}${path}`).set('Authorization', `Bearer ${token}`).send(body),
  put: (path, body) => request(app).put(`${BASE}${path}`).set('Authorization', `Bearer ${token}`).send(body),
  patch: (path, body) => request(app).patch(`${BASE}${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

const idOf = async (code) => String((await ServiceOffering.findOne({ code }))._id);

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
  await Promise.all(
    [User, Category, ProductType, Variant, CatalogService, ServiceOffering, OfferingRate, AuditLog].map((m) => m.deleteMany({})),
  );
  await seedTestCatalogue();
  adminToken = await login(ROLES.SUPER_ADMIN, 'catalogue-admin@test.dev');
  customerToken = await login(ROLES.CUSTOMER, '9200000088');
});

describe('access', () => {
  it('is super-admin only', async () => {
    expect((await request(app).get(`${BASE}/offerings`)).status).toBe(401);
    expect((await as(customerToken).get('/offerings')).status).toBe(403);
    expect((await as(adminToken).get('/offerings')).status).toBe(200);
  });
});

describe('client Test 8 — changing the customer price leaves the payout alone', () => {
  it('799 → 899 on TV 55–65": payout stays 450, history records the change', async () => {
    const id = await idOf('TV-LED-55-65-INSTALL');
    const res = await as(adminToken).post(`/offerings/${id}/rates`, { customerPrice: 899, reason: 'Festive pricing' });
    expect(res.status).toBe(201);
    expect(res.body.data.rate).toMatchObject({ version: 2, customerPrice: 899, spPayout: 450 });
    expect(res.body.data.finalPrice).toBe(1060.82);

    const history = (await as(adminToken).get(`/offerings/${id}/rates`)).body.data;
    expect(history.map((h) => h.version)).toEqual([2, 1]);
    expect(history[0]).toMatchObject({
      reason: 'Festive pricing',
      changedBy: { name: 'Admin Rahul' },
      changes: [{ field: 'customerPrice', from: 799, to: 899 }],
    });

    const log = await AuditLog.findOne({ type: 'Finance' });
    expect(log.action).toContain('TV-LED-55-65-INSTALL rate v2');
  });

  it('a rate change needs a reason and at least one amount', async () => {
    const id = await idOf('TV-LED-55-65-INSTALL');
    expect((await as(adminToken).post(`/offerings/${id}/rates`, { customerPrice: 899 })).status).toBe(400);
    expect((await as(adminToken).post(`/offerings/${id}/rates`, { reason: 'nothing' })).status).toBe(400);
  });

  it('the platform-wide change log lists it', async () => {
    const id = await idOf('ELEC-FAN-INSTALL');
    await as(adminToken).post(`/offerings/${id}/rates`, { spPayout: 190, reason: 'Partner rate revision' });
    const res = await as(adminToken).get('/rate-changes?field=spPayout');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ offering: { code: 'ELEC-FAN-INSTALL' }, changes: [{ field: 'spPayout', from: 180, to: 190 }] });
  });

  it('a future-dated change shows as the next rate, not the current one', async () => {
    const id = await idOf('ELEC-FAN-INSTALL');
    const effectiveFrom = new Date(Date.now() + 7 * 86400000).toISOString();
    const res = await as(adminToken).post(`/offerings/${id}/rates`, { customerPrice: 329, reason: 'Next month', effectiveFrom });
    expect(res.body.data.rate.customerPrice).toBe(299);
    expect(res.body.data.nextRate).toMatchObject({ customerPrice: 329, spPayout: 180 });
  });

  it('saving a real rate clears the DEMO flag', async () => {
    const id = await idOf('CLEAN-TANK-1000L');
    expect((await as(adminToken).get(`/offerings/${id}`)).body.data.needsRateReview).toBe(true);
    const res = await as(adminToken).post(`/offerings/${id}/rates`, { customerPrice: 749, spPayout: 450, reason: 'Client rate sheet' });
    expect(res.body.data.needsRateReview).toBe(false);
  });
});

describe('offering list', () => {
  it('shows current rate, final price, payout and margin per row', async () => {
    const tv = await Category.findOne({ key: 'TV' });
    const res = await as(adminToken).get(`/offerings?category=${tv._id}`);
    // 5 installation / uninstallation offerings + 4 LED service offerings (Phase 8).
    expect(res.body.meta.total).toBe(9);
    const row = res.body.data.find((o) => o.code === 'TV-LED-55-65-INSTALL');
    expect(row).toMatchObject({
      variant: { label: '55–65 inch' },
      rate: { customerPrice: 799, spPayout: 450, version: 1 },
      gstPercent: 18,
      finalPrice: 942.82,
      marginPercent: 43.7,
      needsRateReview: false,
    });
  });

  it('filters by DEMO rates and by search text', async () => {
    const demo = await as(adminToken).get('/offerings?needsRateReview=true&limit=100');
    // Everything except the 5 rates the client's brief gave (Phase 8 seeds every category).
    expect(demo.body.meta.total).toBe(206);
    const search = await as(adminToken).get('/offerings?q=fan');
    expect(search.body.data.map((o) => o.code)).toContain('ELEC-FAN-INSTALL');
  });
});

describe('creating and editing offerings', () => {
  async function tvRefs() {
    const tv = await Category.findOne({ key: 'TV' });
    const led = await ProductType.findOne({ category: tv._id, slug: 'led' });
    const install = await CatalogService.findOne({ category: tv._id, slug: 'installation' });
    return { tv, led, install };
  }

  it('builds a new variant + offering end to end, with an auto-suggested code', async () => {
    const { tv, led, install } = await tvRefs();
    const variant = await as(adminToken).post('/variants', { productType: String(led._id), label: '50 inch' });
    expect(variant.status).toBe(201);

    const res = await as(adminToken).post('/offerings', {
      name: 'LED TV 50 inch Installation',
      bookingType: 'PRODUCT_LINKED',
      category: String(tv._id),
      productType: String(led._id),
      variant: variant.body.data.id,
      service: String(install._id),
      pricingUnit: 'PER_UNIT',
      unitLabel: 'per TV',
      minQty: 1,
      maxQty: 3,
      express: { enabled: true },
      initialRate: { customerPrice: 649, spPayout: 380, expressFee: 99, expressSpIncentive: 50 },
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ code: 'TV-LED-50-INSTALL', rate: { version: 1, customerPrice: 649, spPayout: 380 }, isActive: true });

    const quote = await request(app)
      .post('/api/v1/catalog/quote')
      .send({ lines: [{ offeringId: res.body.data.id, quantity: 1 }] });
    expect(quote.body.data.totals.final).toBe(765.82);
  });

  it('a standalone offering with a new service', async () => {
    const elec = await Category.findOne({ key: 'Electrician' });
    const svc = await as(adminToken).post('/services', { category: String(elec._id), name: 'Doorbell Installation', keywords: ['bell'] });
    const res = await as(adminToken).post('/offerings', {
      name: 'Doorbell Installation',
      bookingType: 'STANDALONE',
      category: String(elec._id),
      service: svc.body.data.id,
      pricingUnit: 'PER_PIECE',
      unitLabel: 'per doorbell',
      maxQty: 3,
      initialRate: { customerPrice: 149, spPayout: 90 },
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ code: 'ELEC-DOORBELL-INSTALL', bookingType: 'STANDALONE', productType: null });
  });

  it('rejects an invalid combination and leaves nothing behind', async () => {
    const { tv, install } = await tvRefs();
    const elecFan = await CatalogService.findOne({ slug: 'fan_installation' });
    const res = await as(adminToken).post('/offerings', {
      name: 'Wrong', bookingType: 'STANDALONE', category: String(tv._id), service: String(elecFan._id),
      initialRate: { customerPrice: 1, spPayout: 1 },
    });
    expect(res.status).toBe(400);
    expect(await ServiceOffering.exists({ name: 'Wrong' })).toBeNull();

    const dup = await as(adminToken).post('/offerings', {
      name: 'Dup', bookingType: 'PRODUCT_LINKED', category: String(tv._id),
      productType: String((await ProductType.findOne({ slug: 'led' }))._id),
      variant: String((await Variant.findOne({ label: '32 inch' }))._id),
      service: String(install._id), initialRate: { customerPrice: 1, spPayout: 1 },
    });
    expect(dup.status).toBe(409);
  });

  it('content edits cannot touch code, combination or money', async () => {
    const id = await idOf('ELEC-FAN-INSTALL');
    const ok = await as(adminToken).put(`/offerings/${id}`, { description: 'Ceiling fans up to 56"', included: ['Mounting'] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.description).toBe('Ceiling fans up to 56"');

    for (const body of [{ code: 'X' }, { spPayout: 1 }, { customerPrice: 1 }, { service: id }]) {
      expect((await as(adminToken).put(`/offerings/${id}`, body)).status).toBe(400);
    }
  });

  it('activation requires a rate; deactivation hides it from customers', async () => {
    const id = await idOf('AC-WINDOW-UNINSTALL');
    await as(adminToken).patch(`/offerings/${id}/status`, { isActive: false });
    const tree = await request(app).get('/api/v1/catalog/categories/AC/tree');
    expect(tree.body.data.offerings.some((o) => o.code === 'AC-WINDOW-UNINSTALL')).toBe(false);

    await OfferingRate.deleteMany({ offering: id });
    const res = await as(adminToken).patch(`/offerings/${id}/status`, { isActive: true });
    expect([res.status, res.body.error.message]).toEqual([400, 'Add a price before activating this offering']);
  });

  it('duplicates an offering for a sibling variant, inactive and flagged for review', async () => {
    const id = await idOf('AC-SPLIT-15T-INSTALL');
    const oneTon = await Variant.findOne({ label: '1 Ton' });
    await ServiceOffering.deleteOne({ code: 'AC-SPLIT-1T-INSTALL' });

    const res = await as(adminToken).post(`/offerings/${id}/duplicate`, { variant: String(oneTon._id), name: 'Split AC 1 Ton Installation' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      code: 'AC-SPLIT-1T-INSTALL',
      isActive: false,
      needsRateReview: true,
      rate: { customerPrice: 1499, spPayout: 900 },
      variant: { label: '1 Ton' },
    });
  });

  it('suggests codes in the client style', async () => {
    const { tv, led, install } = await tvRefs();
    const v = await Variant.findOne({ label: '55–65 inch' });
    const res = await as(adminToken).get(`/suggest-code?category=${tv._id}&productType=${led._id}&variant=${v._id}&service=${install._id}`);
    expect(res.body.data.code).toBe('TV-LED-55-65-INSTALL-2'); // taken, so suffixed
  });
});

describe('structure', () => {
  it('returns product types with variants and services with options, inactive included', async () => {
    await ProductType.updateOne({ slug: 'window' }, { isActive: false });
    const ac = await Category.findOne({ key: 'AC' });
    const res = await as(adminToken).get(`/categories/${ac._id}/structure`);
    const window = res.body.data.productTypes.find((pt) => pt.slug === 'window');
    expect(window.isActive).toBe(false);
    const split = res.body.data.productTypes.find((pt) => pt.slug === 'split');
    expect(split.variants.map((v) => v.label)).toEqual(['1 Ton', '1.5 Ton', '2 Ton']);

    const tank = await Category.findOne({ key: 'Water Tank Sump Cleaning' });
    const tankRes = await as(adminToken).get(`/categories/${tank._id}/structure`);
    expect(tankRes.body.data.services.find((s) => s.slug === 'water_tank_cleaning').options).toHaveLength(4);
  });

  it('lists categories with offering counts', async () => {
    const res = await as(adminToken).get('/categories');
    const ac = res.body.data.find((c) => c.key === 'AC');
    expect(ac.offerings).toEqual({ total: 10, active: 10, needsRateReview: 8 });
  });
});

describe('location / pincode prices (Phase 10)', () => {
  const quoteIn = async (code, location) => {
    const id = await idOf(code);
    return (await request(app).post('/api/v1/catalog/quote').send({ lines: [{ offeringId: id, quantity: 1 }], location }).expect(200)).body.data.lines[0].unitPrice;
  };
  const jaipur = { type: 'CITY', value: 'Jaipur' };
  const full = { customerPrice: 279, spPayout: 170, expressFee: 99, expressSpIncentive: 50 };

  it('adds a city price that only that city sees, without touching the default or its DEMO flag', async () => {
    const fan = await idOf('ELEC-FAN-INSTALL');
    const res = await as(adminToken).post(`/offerings/${fan}/rates`, { ...full, scope: jaipur, reason: 'Jaipur launch' }).expect(201);
    expect(res.body.data.rate).toMatchObject({ customerPrice: 299, spPayout: 180 });
    expect(res.body.data.localRates).toEqual([
      expect.objectContaining({ scope: jaipur, rate: expect.objectContaining({ customerPrice: 279, spPayout: 170, version: 1 }) }),
    ]);
    expect(await quoteIn('ELEC-FAN-INSTALL', { city: 'jaipur' })).toBe(279);
    expect(await quoteIn('ELEC-FAN-INSTALL', { city: 'Delhi' })).toBe(299);

    // A DEMO offering keeps its DEMO flag when only a city price is added.
    const sw = await idOf('ELEC-SWITCH-INSTALL');
    await as(adminToken).post(`/offerings/${sw}/rates`, { customerPrice: 89, spPayout: 50, expressFee: 99, expressSpIncentive: 50, scope: jaipur, reason: 'Jaipur' }).expect(201);
    expect((await ServiceOffering.findById(sw)).needsRateReview).toBe(true);

    const log = await AuditLog.findOne({ action: /ELEC-FAN-INSTALL city Jaipur rate v1/ });
    expect(log).not.toBeNull();
  });

  it('a new location needs every amount; the same city in any case is one version chain', async () => {
    const fan = await idOf('ELEC-FAN-INSTALL');
    const partial = await as(adminToken).post(`/offerings/${fan}/rates`, { customerPrice: 279, scope: jaipur, reason: 'x x x' });
    expect(partial.status).toBe(400);
    expect(partial.body.error.message).toMatch(/every amount/);

    await as(adminToken).post(`/offerings/${fan}/rates`, { ...full, scope: jaipur, reason: 'Jaipur launch' }).expect(201);
    const again = await as(adminToken).post(`/offerings/${fan}/rates`, { customerPrice: 289, scope: { type: 'CITY', value: 'JAIPUR' }, reason: 'Jaipur revision' }).expect(201);
    expect(again.body.data.localRates).toHaveLength(1);
    expect(again.body.data.localRates[0]).toMatchObject({ scope: jaipur, rate: { customerPrice: 289, spPayout: 170, version: 2 } });
  });

  it('a pincode price beats the city price; a bad pincode is refused', async () => {
    const fan = await idOf('ELEC-FAN-INSTALL');
    await as(adminToken).post(`/offerings/${fan}/rates`, { ...full, scope: jaipur, reason: 'Jaipur launch' }).expect(201);
    await as(adminToken).post(`/offerings/${fan}/rates`, { ...full, customerPrice: 259, scope: { type: 'PINCODE', value: '302017' }, reason: 'Malviya Nagar' }).expect(201);
    expect(await quoteIn('ELEC-FAN-INSTALL', { city: 'Jaipur', pincode: '302017' })).toBe(259);
    await as(adminToken).post(`/offerings/${fan}/rates`, { ...full, scope: { type: 'PINCODE', value: '30201' }, reason: 'typo' }).expect(400);
    await as(adminToken).post(`/offerings/${fan}/rates`, { ...full, scope: { type: 'CITY' }, reason: 'no city' }).expect(400);

    const list = await as(adminToken).get('/offerings?q=ELEC-FAN-INSTALL').expect(200);
    expect(list.body.data[0].localRateCount).toBe(2);
  });

  it('ending a city price sends that city back to the default; it can be added again later', async () => {
    const fan = await idOf('ELEC-FAN-INSTALL');
    await as(adminToken).post(`/offerings/${fan}/rates`, { ...full, scope: jaipur, reason: 'Jaipur launch' }).expect(201);
    const ended = await as(adminToken).post(`/offerings/${fan}/rates/end`, { scope: jaipur, reason: 'Promo over' }).expect(200);
    expect(ended.body.data.localRates).toEqual([]);
    expect(await quoteIn('ELEC-FAN-INSTALL', { city: 'Jaipur' })).toBe(299);

    await as(adminToken).post(`/offerings/${fan}/rates/end`, { scope: jaipur, reason: 'again' }).expect(404);
    await as(adminToken).post(`/offerings/${fan}/rates/end`, { scope: { type: 'DEFAULT' }, reason: 'nope' }).expect(400);

    // Same amounts again — allowed, because the old window is closed.
    const back = await as(adminToken).post(`/offerings/${fan}/rates`, { customerPrice: 279, scope: jaipur, reason: 'Promo back' }).expect(201);
    expect(back.body.data.localRates[0].rate).toMatchObject({ customerPrice: 279, version: 2 });
    expect(await quoteIn('ELEC-FAN-INSTALL', { city: 'Jaipur' })).toBe(279);

    const history = (await as(adminToken).get(`/offerings/${fan}/rates`).expect(200)).body.data;
    expect(history.filter((r) => r.scope.type === 'CITY').map((r) => r.version)).toEqual([2, 1]);
  });
});
