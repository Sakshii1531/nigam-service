import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyPlan } from '../src/modules/warranty-amc-exchange/extendedWarrantyPlan.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { AMC_PLAN_SEED, EW_PLAN_SEED } from '../scripts/planSeedData.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// Super Admin → Plans → AMC plans (docs/master-catalogue Phase 12): the one
// "plan" product (membership merged in), fully admin-managed, and exactly
// what the customer AMC page sells.

const TEST_DB_URI = testDbUri('plans_admin');
let app;
let admin;
const flow = jobFlow(() => app, { phoneStart: 9301100000 });
const api = (method, path, body) => request(app)[method](`/api/v1/super-admin/plans${path}`).set('Authorization', `Bearer ${admin}`).send(body);

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
  await Promise.all([User, Category, AMCPlan, AMCSubscription, ExtendedWarrantyPlan, ExtendedWarrantyOrder, AuditLog].map((m) => m.deleteMany({})));
  await Category.create([
    { key: 'AC', name: 'AC', sortOrder: 1 },
    { key: 'Refrigerator', name: 'Refrigerator', sortOrder: 2 },
  ]);
  await User.create({ role: ROLES.SUPER_ADMIN, email: 'plans-admin@test.dev', name: 'Admin', passwordHash: await hashPassword('password123') });
  admin = await flow.loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: 'plans-admin@test.dev' });
});

const acGold = {
  name: 'AC Gold AMC',
  tier: 'Gold',
  applianceCategory: 'AC',
  price: 1799,
  visitsTotal: 3,
  durationMonths: 12,
  benefits: ['3 scheduled visits', 'One foam-jet cleaning'],
  isPopular: true,
};

describe('admin AMC plans', () => {
  it('creates, lists (with sales), edits and audits a plan', async () => {
    const created = await api('post', '/amc', acGold).expect(201);
    expect(created.body.data).toMatchObject({ name: 'AC Gold AMC', applianceCategory: 'AC', price: 1799, subscribers: 0 });

    const list = await api('get', '/amc').expect(200);
    expect(list.body.data).toHaveLength(1);

    const edited = await api('put', `/amc/${created.body.data.id}`, { price: 1899 }).expect(200);
    expect(edited.body.data.price).toBe(1899);
    expect(await AuditLog.findOne({ action: /AC Gold AMC" updated — price 1799 → 1899/ })).not.toBeNull();
  });

  it('refuses an unknown appliance and bad numbers', async () => {
    await api('post', '/amc', { ...acGold, applianceCategory: 'Spaceship' }).expect(400);
    await api('post', '/amc', { ...acGold, price: -1 }).expect(400);
    await api('post', '/amc', { ...acGold, visitsTotal: 1.5 }).expect(400);
  });

  it('a sold plan cannot be deleted — only switched off', async () => {
    const plan = await AMCPlan.create(acGold);
    const cust = await flow.customer();
    await AMCSubscription.create({ user: cust.user._id, plan: plan._id, visitsTotal: 3, visitsRemaining: 3 });
    await api('delete', `/amc/${plan.id}`).expect(409);
    await api('put', `/amc/${plan.id}`, { isActive: false }).expect(200);
    const unsold = await AMCPlan.create({ ...acGold, name: 'Unsold' });
    await api('delete', `/amc/${unsold.id}`).expect(200);
  });

  it('is super-admin only', async () => {
    const cust = await flow.customer();
    await request(app).get('/api/v1/super-admin/plans/amc').set('Authorization', `Bearer ${cust.token}`).expect(403);
  });
});

describe('customer AMC page reads exactly what the admin set', () => {
  it('appliance picker: appliances with plans and their "from" price (any-appliance plans included)', async () => {
    await AMCPlan.create([
      acGold,
      { ...acGold, name: 'AC Silver AMC', tier: 'Silver', price: 1199, visitsTotal: 2, isPopular: false },
      { name: 'Fridge Gold', applianceCategory: 'Refrigerator', price: 1299, visitsTotal: 2 },
      { name: 'Any Silver', applianceCategory: null, price: 999, visitsTotal: 2 },
      { name: 'Retired', applianceCategory: 'AC', price: 99, visitsTotal: 1, isActive: false },
    ]);
    const res = await request(app).get('/api/v1/warranty-amc/amc/appliances').expect(200);
    expect(res.body.data).toEqual([
      { appliance: 'AC', name: 'AC', imageUrl: null, fromPrice: 999, planCount: 3 },
      { appliance: 'Refrigerator', name: 'Refrigerator', imageUrl: null, fromPrice: 999, planCount: 2 },
    ]);

    const plans = await request(app).get('/api/v1/warranty-amc/amc/plans?appliance=AC').expect(200);
    expect(plans.body.data.map((p) => p.name).sort()).toEqual(['AC Gold AMC', 'AC Silver AMC', 'Any Silver']);
  });

  it('buying a plan gives its visits and its validity', async () => {
    const plan = await AMCPlan.create({ ...acGold, durationMonths: 6 });
    const cust = await flow.customer();
    const res = await request(app)
      .post('/api/v1/warranty-amc/amc/subscriptions')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ plan: plan.id, brand: 'LG', model: 'X' })
      .expect(201);
    const sub = res.body.data.subscription;
    expect(sub.visitsTotal).toBe(3);
    const months = (new Date(sub.expiryDate) - Date.now()) / (30.4 * 86400000);
    expect(months).toBeGreaterThan(5.5);
    expect(months).toBeLessThan(6.5);

    await AMCPlan.updateOne({ _id: plan._id }, { isActive: false });
    await request(app).post('/api/v1/warranty-amc/amc/subscriptions').set('Authorization', `Bearer ${cust.token}`).send({ plan: plan.id }).expect(404);
  });

  it('membership is gone — its routes 404', async () => {
    await request(app).get('/api/v1/memberships/plans').expect(404);
  });

  it('the seed describes every plan honestly (visits line, no discount claims)', () => {
    for (const plan of AMC_PLAN_SEED) {
      expect(plan.benefits[0]).toMatch(/scheduled service visit/);
      expect(plan.benefits.join(' ')).not.toMatch(/% off|discount/i);
    }
  });
});

describe('extended-warranty packs (Phase 13)', () => {
  const acTwo = { name: 'AC 2-Year Extended Warranty', applianceCategory: 'AC', durationYears: 2, price: 1999, claimsTotal: 3, features: ['Compressor cover'] };

  it('admin creates and edits a pack; the Buy screen reads exactly that', async () => {
    const created = await api('post', '/extended-warranty', acTwo).expect(201);
    expect(created.body.data).toMatchObject({ name: acTwo.name, price: 1999, sold: 0 });
    await api('post', '/extended-warranty', { name: 'Any 1-Year', durationYears: 1, price: 799, claimsTotal: 2 }).expect(201);
    await api('put', `/extended-warranty/${created.body.data.id}`, { price: 2099 }).expect(200);

    const appliances = await request(app).get('/api/v1/warranty-amc/extended-warranty/appliances').expect(200);
    expect(appliances.body.data).toEqual([{ appliance: 'AC', name: 'AC', imageUrl: null, fromPrice: 799, planCount: 2 }]);
    const packs = await request(app).get('/api/v1/warranty-amc/extended-warranty/plans?category=AC').expect(200);
    expect(packs.body.data.map((p) => [p.name, p.price])).toEqual([['AC 2-Year Extended Warranty', 2099], ['Any 1-Year', 799]]);
    expect(await AuditLog.findOne({ action: /warranty pack "AC 2-Year Extended Warranty" updated — price 1999 → 2099/ })).not.toBeNull();
  });

  it('a sold pack cannot be deleted, and a switched-off pack cannot be bought', async () => {
    const pack = await ExtendedWarrantyPlan.create(acTwo);
    const cust = await flow.customer();
    const bought = await request(app)
      .post('/api/v1/warranty-amc/extended-warranty/orders')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ plan: pack.id, category: 'AC', brand: 'LG', modelName: 'X' })
      .expect(201);
    expect(bought.body.data.order).toMatchObject({ price: 1999, claimsTotal: 3 });
    await api('delete', `/extended-warranty/${pack.id}`).expect(409);
    await api('put', `/extended-warranty/${pack.id}`, { isActive: false }).expect(200);
    await request(app)
      .post('/api/v1/warranty-amc/extended-warranty/orders')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ plan: pack.id, category: 'AC' })
      .expect(404);
  });

  it('refuses bad packs and unknown appliances', async () => {
    await api('post', '/extended-warranty', { ...acTwo, durationYears: 0 }).expect(400);
    await api('post', '/extended-warranty', { ...acTwo, applianceCategory: 'Spaceship' }).expect(400);
  });

  it('every seeded pack names a catalogue appliance', () => {
    for (const pack of EW_PLAN_SEED) expect(pack.applianceCategory).toEqual(expect.any(String));
  });
});
