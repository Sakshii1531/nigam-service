/**
 * finance.test.js
 *
 * The four finance modules whose models existed but had no service or routes:
 *   1. Revenue              — aggregated commission/margin rows
 *   2. PartnerPayout        — money owed to a service partner
 *   3. BillingTransaction   — platform-side money movements
 *   4. GatewayTransaction   — raw payment-gateway log
 *
 * Focus is on the invariants each service enforces (derived figures, terminal
 * states, double-settlement guards), not just CRUD happy paths.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { ServicePartner } from '../src/modules/super-admin/servicePartner.model.js';
import { Revenue } from '../src/modules/super-admin/revenue.model.js';
import { PartnerPayout } from '../src/modules/super-admin/partnerPayout.model.js';
import { BillingTransaction } from '../src/modules/super-admin/billingTransaction.model.js';
import { GatewayTransaction } from '../src/modules/super-admin/gatewayTransaction.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('finance');

let app;
let counter = 0;


async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

async function seedSuperAdmin() {
  const email = `finance-admin-${counter++}@test.local`;
  const password = 'password123';
  await User.create({
    role: ROLES.SUPER_ADMIN,
    name: 'Finance Admin',
    email,
    passwordHash: await hashPassword(password),
    status: 'Active',
  });
  return loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: email, password });
}

async function seedCustomer(name = 'Amit Sharma') {
  return User.create({
    role: ROLES.CUSTOMER,
    name,
    phone: `96000${String(counter++).padStart(5, '0')}`,
    passwordHash: await hashPassword('password123'),
  });
}

async function seedPartner(name = 'Care Tech Solutions') {
  const city = await City.create({ name: `City ${counter++}`, state: 'UP' });
  const partner = await ServicePartner.create({ name, city: city._id });
  return { partner, city };
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
  await Promise.all([
    User.deleteMany({}),
    City.deleteMany({}),
    ServicePartner.deleteMany({}),
    Revenue.deleteMany({}),
    PartnerPayout.deleteMany({}),
    BillingTransaction.deleteMany({}),
    GatewayTransaction.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

// ── 1. Revenue ────────────────────────────────────────────────────────────────

describe('Revenue', () => {
  it('derives net and margin from gross/partnerShare instead of trusting the client', async () => {
    const token = await seedSuperAdmin();

    const res = await request(app)
      .post('/api/v1/super-admin/revenue')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'Bookings', gross: 450000, partnerShare: 360000 })
      .expect(201);

    expect(res.body.data.net).toBe(90000);
    expect(res.body.data.marginPercent).toBe(20);
  });

  it('treats a zero-partner-share row as full margin, and zero gross as zero margin', async () => {
    const token = await seedSuperAdmin();

    const full = await request(app)
      .post('/api/v1/super-admin/revenue')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'AMC', gross: 284000 })
      .expect(201);
    expect(full.body.data.net).toBe(284000);
    expect(full.body.data.marginPercent).toBe(100);

    // Guards the divide-by-zero path rather than emitting NaN/Infinity.
    const zero = await request(app)
      .post('/api/v1/super-admin/revenue')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'Empty', gross: 0 })
      .expect(201);
    expect(zero.body.data.marginPercent).toBe(0);
    expect(zero.body.data.net).toBe(0);
  });

  it('rejects a partner share larger than gross', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .post('/api/v1/super-admin/revenue')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'Bad', gross: 100, partnerShare: 500 })
      .expect(400);
  });

  it('recomputes net when only gross is edited, leaving no stale figure', async () => {
    const token = await seedSuperAdmin();
    const createRes = await request(app)
      .post('/api/v1/super-admin/revenue')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'Repairs', gross: 1000, partnerShare: 400 })
      .expect(201);
    expect(createRes.body.data.net).toBe(600);

    const updateRes = await request(app)
      .put(`/api/v1/super-admin/revenue/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gross: 2000 })
      .expect(200);

    expect(updateRes.body.data.net).toBe(1600);
    expect(updateRes.body.data.marginPercent).toBe(80);
  });

  it('summarises a blended margin over every matching row, not an average of rows', async () => {
    const token = await seedSuperAdmin();
    await Revenue.create({ source: 'A', gross: 1000, partnerShare: 900, net: 100, marginPercent: 10 });
    await Revenue.create({ source: 'B', gross: 1000, partnerShare: 0, net: 1000, marginPercent: 100 });

    const res = await request(app)
      .get('/api/v1/super-admin/revenue/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.gross).toBe(2000);
    expect(res.body.data.net).toBe(1100);
    // Blended 1100/2000 = 55%, not (10+100)/2 = 55 by coincidence of averaging.
    expect(res.body.data.marginPercent).toBe(55);
    expect(res.body.data.rows).toBe(2);
  });

  it('filters by source and deletes a row', async () => {
    const token = await seedSuperAdmin();
    await Revenue.create({ source: 'Keep', gross: 10, net: 10 });
    const drop = await Revenue.create({ source: 'Drop', gross: 10, net: 10 });

    const filtered = await request(app)
      .get('/api/v1/super-admin/revenue?source=Keep')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);

    await request(app)
      .delete(`/api/v1/super-admin/revenue/${drop.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(await Revenue.countDocuments()).toBe(1);
  });

  it('is closed to unauthenticated callers', async () => {
    await request(app).get('/api/v1/super-admin/revenue').expect(401);
  });
});

// ── 2. Partner payouts ────────────────────────────────────────────────────────

describe('PartnerPayout', () => {
  it('creates a payout, defaulting the region to the partner\'s own city', async () => {
    const token = await seedSuperAdmin();
    const { partner, city } = await seedPartner();

    const res = await request(app)
      .post('/api/v1/super-admin/payouts')
      .set('Authorization', `Bearer ${token}`)
      .send({ partner: partner.id, balance: 42500 })
      .expect(201);

    expect(res.body.data.partner.name).toBe('Care Tech Solutions');
    expect(res.body.data.city.id).toBe(city.id);
    expect(res.body.data.status).toBe('Pending Approval');
  });

  it('404s for an unknown partner', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .post('/api/v1/super-admin/payouts')
      .set('Authorization', `Bearer ${token}`)
      .send({ partner: String(new mongoose.Types.ObjectId()), balance: 100 })
      .expect(404);
  });

  it('settles a payout: records the amount, zeroes the balance, writes an audit entry', async () => {
    const token = await seedSuperAdmin();
    const { partner } = await seedPartner();
    const payout = await PartnerPayout.create({ partner: partner._id, balance: 42500 });

    const res = await request(app)
      .patch(`/api/v1/super-admin/payouts/${payout.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.status).toBe('Paid');
    expect(res.body.data.balance).toBe(0);
    expect(res.body.data.lastPaidAmount).toBe(42500);
    expect(res.body.data.lastPaidAt).toBeDefined();

    const audit = await AuditLog.findOne({ type: 'Finance' });
    expect(audit.action).toMatch(/Settled partner payout/);
  });

  it('refuses to settle twice — the guard against double-paying', async () => {
    const token = await seedSuperAdmin();
    const { partner } = await seedPartner();
    const payout = await PartnerPayout.create({ partner: partner._id, balance: 100 });

    await request(app)
      .patch(`/api/v1/super-admin/payouts/${payout.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .patch(`/api/v1/super-admin/payouts/${payout.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const inDb = await PartnerPayout.findById(payout.id);
    expect(inDb.lastPaidAmount).toBe(100);
  });

  it('refuses to settle a payout with nothing outstanding', async () => {
    const token = await seedSuperAdmin();
    const { partner } = await seedPartner();
    const payout = await PartnerPayout.create({ partner: partner._id, balance: 0 });

    await request(app)
      .patch(`/api/v1/super-admin/payouts/${payout.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('accrues onto a pending payout but never onto a settled one', async () => {
    const token = await seedSuperAdmin();
    const { partner } = await seedPartner();
    const payout = await PartnerPayout.create({ partner: partner._id, balance: 100 });

    const accrued = await request(app)
      .patch(`/api/v1/super-admin/payouts/${payout.id}/accrue`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50 })
      .expect(200);
    expect(accrued.body.data.balance).toBe(150);

    await request(app)
      .patch(`/api/v1/super-admin/payouts/${payout.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .patch(`/api/v1/super-admin/payouts/${payout.id}/accrue`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 25 })
      .expect(409);
  });

  it('summarises outstanding vs settled', async () => {
    const token = await seedSuperAdmin();
    const { partner } = await seedPartner();
    await PartnerPayout.create({ partner: partner._id, balance: 1000 });
    await PartnerPayout.create({ partner: partner._id, balance: 500 });
    await PartnerPayout.create({ partner: partner._id, balance: 0, status: 'Paid' });

    const res = await request(app)
      .get('/api/v1/super-admin/payouts/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.pendingAmount).toBe(1500);
    expect(res.body.data.pendingCount).toBe(2);
    expect(res.body.data.paidCount).toBe(1);
  });
});

// ── 3. Billing transactions ───────────────────────────────────────────────────

describe('BillingTransaction', () => {
  it('creates a transaction against a real user and resolves them on read', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/super-admin/billing')
      .set('Authorization', `Bearer ${token}`)
      .send({ user: customer.id, amount: 1500, type: 'Service Fee', status: 'Paid', description: 'TV repair' })
      .expect(201);

    expect(res.body.data.user.name).toBe('Amit Sharma');

    const list = await request(app)
      .get('/api/v1/super-admin/billing')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.data[0].user.name).toBe('Amit Sharma');
  });

  it('404s for an unknown user rather than storing a dangling reference', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .post('/api/v1/super-admin/billing')
      .set('Authorization', `Bearer ${token}`)
      .send({ user: String(new mongoose.Types.ObjectId()), amount: 100, type: 'Refund' })
      .expect(404);
    expect(await BillingTransaction.countDocuments()).toBe(0);
  });

  it('counts only settled rows in the summary, splitting inflow from outflow', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();

    await BillingTransaction.create({ user: customer._id, amount: 1500, type: 'Service Fee', status: 'Paid' });
    await BillingTransaction.create({ user: customer._id, amount: 800, type: 'Payout', status: 'Paid' });
    await BillingTransaction.create({ user: customer._id, amount: 500, type: 'Refund', status: 'Paid' });
    // Pending and failed money has not moved and must not appear in the totals.
    await BillingTransaction.create({ user: customer._id, amount: 9999, type: 'Service Fee', status: 'Pending' });
    await BillingTransaction.create({ user: customer._id, amount: 7777, type: 'Service Fee', status: 'Failed' });

    const res = await request(app)
      .get('/api/v1/super-admin/billing/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.inflow).toBe(1500);
    expect(res.body.data.outflow).toBe(1300);
    expect(res.body.data.net).toBe(200);
  });

  it('refuses to re-open a settled transaction', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();
    const txn = await BillingTransaction.create({ user: customer._id, amount: 100, type: 'Service Fee', status: 'Paid' });

    await request(app)
      .patch(`/api/v1/super-admin/billing/${txn.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Pending' })
      .expect(409);
  });

  it('settles a pending transaction and logs the move', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();
    const txn = await BillingTransaction.create({ user: customer._id, amount: 100, type: 'Service Fee', status: 'Pending' });

    const res = await request(app)
      .patch(`/api/v1/super-admin/billing/${txn.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Paid' })
      .expect(200);

    expect(res.body.data.status).toBe('Paid');
    const audit = await AuditLog.findOne({ type: 'Finance' });
    expect(audit.action).toMatch(/Pending to Paid/);
  });

  it('filters by type and status', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();
    await BillingTransaction.create({ user: customer._id, amount: 1, type: 'Payout', status: 'Pending' });
    await BillingTransaction.create({ user: customer._id, amount: 2, type: 'Refund', status: 'Failed' });

    const res = await request(app)
      .get('/api/v1/super-admin/billing?type=Refund&status=Failed')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('Refund');
  });
});

// ── 4. Gateway transactions ───────────────────────────────────────────────────

describe('GatewayTransaction', () => {
  it('creates a transaction and resolves the customer', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer('Jyoti Singh');

    const res = await request(app)
      .post('/api/v1/super-admin/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ref: 'TXN-982103482', customer: customer.id, amount: 1250, gateway: 'UPI' })
      .expect(201);

    expect(res.body.data.customer.name).toBe('Jyoti Singh');
    expect(res.body.data.status).toBe('Success');
  });

  it('reports a duplicate gateway ref as a 409, not a driver error', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();
    const body = { ref: 'TXN-DUPE', customer: customer.id, amount: 100, gateway: 'Card' };

    await request(app)
      .post('/api/v1/super-admin/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

    const res = await request(app)
      .post('/api/v1/super-admin/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(409);
    expect(res.body.error.message).toMatch(/already exists/);
  });

  it('refunds a successful charge and logs it', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();
    const txn = await GatewayTransaction.create({ ref: 'TXN-1', customer: customer._id, amount: 500, gateway: 'UPI' });

    const res = await request(app)
      .patch(`/api/v1/super-admin/transactions/${txn.id}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.status).toBe('Refunded');
    const audit = await AuditLog.findOne({ type: 'Finance' });
    expect(audit.action).toMatch(/Refunded gateway transaction TXN-1/);
  });

  it('never refunds a failed charge or refunds the same charge twice', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();

    const failed = await GatewayTransaction.create({ ref: 'TXN-F', customer: customer._id, amount: 100, gateway: 'NetBanking', status: 'Failed' });
    // Nothing was ever collected, so there is nothing to send back.
    await request(app)
      .patch(`/api/v1/super-admin/transactions/${failed.id}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    const ok = await GatewayTransaction.create({ ref: 'TXN-S', customer: customer._id, amount: 100, gateway: 'UPI' });
    await request(app)
      .patch(`/api/v1/super-admin/transactions/${ok.id}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app)
      .patch(`/api/v1/super-admin/transactions/${ok.id}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('excludes refunded money from net collected and reports a failure rate', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();
    await GatewayTransaction.create({ ref: 'A', customer: customer._id, amount: 1000, gateway: 'UPI', status: 'Success' });
    await GatewayTransaction.create({ ref: 'B', customer: customer._id, amount: 400, gateway: 'UPI', status: 'Refunded' });
    await GatewayTransaction.create({ ref: 'C', customer: customer._id, amount: 200, gateway: 'Card', status: 'Failed' });
    await GatewayTransaction.create({ ref: 'D', customer: customer._id, amount: 200, gateway: 'Card', status: 'Failed' });

    const res = await request(app)
      .get('/api/v1/super-admin/transactions/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.netCollected).toBe(1000);
    expect(res.body.data.refundedAmount).toBe(400);
    expect(res.body.data.failedCount).toBe(2);
    expect(res.body.data.failureRatePercent).toBe(50);
  });

  it('looks a transaction up by its gateway ref, and filters by gateway', async () => {
    const token = await seedSuperAdmin();
    const customer = await seedCustomer();
    await GatewayTransaction.create({ ref: 'TXN-FIND-ME', customer: customer._id, amount: 1, gateway: 'UPI' });
    await GatewayTransaction.create({ ref: 'TXN-OTHER', customer: customer._id, amount: 1, gateway: 'Card' });

    const byRef = await request(app)
      .get('/api/v1/super-admin/transactions?ref=TXN-FIND-ME')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(byRef.body.data).toHaveLength(1);

    const byGateway = await request(app)
      .get('/api/v1/super-admin/transactions?gateway=Card')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(byGateway.body.data).toHaveLength(1);
    expect(byGateway.body.data[0].ref).toBe('TXN-OTHER');
  });

  it('rejects an unknown gateway value', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .get('/api/v1/super-admin/transactions?gateway=Bitcoin')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});

// ── Authorization, across all four ────────────────────────────────────────────

describe('finance modules — authorization', () => {
  it('closes every finance route to non-super-admins', async () => {
    await User.create({
      role: ROLES.CUSTOMER,
      phone: '9600099999',
      name: 'Cust',
      passwordHash: await hashPassword('password123'),
    });
    const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: '9600099999', password: 'password123' });

    for (const path of ['revenue', 'payouts', 'billing', 'transactions']) {
      await request(app).get(`/api/v1/super-admin/${path}`).expect(401);
      await request(app)
        .get(`/api/v1/super-admin/${path}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    }
  });

  it('routes /summary to the aggregate, not to the id lookup', async () => {
    const token = await seedSuperAdmin();
    for (const path of ['revenue', 'payouts', 'billing', 'transactions']) {
      const res = await request(app)
        .get(`/api/v1/super-admin/${path}/summary`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      // An id lookup would 404 or return a document; a summary returns an object
      // of totals with no `id` of its own.
      expect(res.body.data.id).toBeUndefined();
    }
  });
});
