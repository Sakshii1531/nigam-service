import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { seedTestCatalogue, clearCatalogue } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// NCC gross service margin report (docs/master-catalogue Phase 7) on the
// phase doc's worked example: completed jobs walked through the real API.
//
//   AC:          Split 1.5 T install × 2, ASAP, + 1 socket add-on
//   Electrician: Fan × 2 (+ a ₹200 part — goods, not service revenue)
//   Covered:     Window AC install under brand warranty

const TEST_DB_URI = testDbUri('margin_report');
let app;
let adminToken;
let partnerA;
let partnerB;
const flow = jobFlow(() => app, { phoneStart: 9300500000 });
const report = (query = '') =>
  request(app).get(`/api/v1/super-admin/reports/margin${query}`).set('Authorization', `Bearer ${adminToken}`);

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp().listen(0);
  await clearCatalogue();
  await seedTestCatalogue();

  await User.create({ role: ROLES.SUPER_ADMIN, email: 'margin-admin@test.dev', name: 'Admin', passwordHash: await hashPassword('password123') });
  adminToken = await flow.loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: 'margin-admin@test.dev' });
  partnerA = await flow.partner(['AC'], 'Partner A');
  partnerB = await flow.partner(['Electrician'], 'Partner B');

  const ac = await flow.jobToBilling('AC-SPLIT-15T-INSTALL', {
    sp: partnerA,
    bookingOptions: { quantity: 2, timeGroup: 'ASAP', requiredInfo: [{ key: 'wall_type', value: 'Concrete' }] },
  });
  await flow.addAddOn(ac, 'ELEC-SOCKET-INSTALL', { category: 'Electrician' });
  await flow.billAndCollect(ac);

  const fan = await flow.jobToBilling('ELEC-FAN-INSTALL', {
    sp: partnerB,
    bookingOptions: { quantity: 2, requiredInfo: [{ key: 'fan_type', value: 'Ceiling' }] },
  });
  await flow.billAndCollect({ ...fan, parts: [{ name: 'Fan capacitor', price: 200, checked: true }] });

  const covered = await flow.jobToBilling('AC-WINDOW-INSTALL', {
    sp: partnerA,
    bookingOptions: { purchaseDate: new Date(Date.now() - 30 * 86400000).toISOString(), coverageType: 'Brand Warranty' },
  });
  await flow.billAndCollect(covered);

  // A booking that never completed is not in the report.
  await flow.jobToBilling('ELEC-SWITCH-INSTALL', { sp: partnerB });
}, 60000);

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('GET /super-admin/reports/margin', () => {
  it('by category — the worked example, to the paisa', async () => {
    const { paid, covered } = (await report('?groupBy=category').expect(200)).body.data;
    const byKey = Object.fromEntries(paid.groups.map((g) => [g.key, g]));

    // 2 × 1,499 + 99 express + 129 socket = 3,226 ex-GST; 18 % = 580.68.
    // Payout 2 × 900 + 50 express incentive + 75 socket = 1,925.
    expect(byKey.AC).toEqual({
      key: 'AC',
      label: 'AC',
      jobs: 1,
      revenue: 3226,
      discounts: 0,
      expressFees: 99,
      gstCollected: 580.68,
      sparePartsRevenue: 0,
      payouts: 1925,
      margin: 1301,
      marginPercent: 40.3,
    });
    // Fan × 2: 598 ex-GST, GST 107.64 on the service + 36 on the part; payout 360.
    expect(byKey.Electrician).toMatchObject({
      jobs: 1,
      revenue: 598,
      gstCollected: 143.64,
      sparePartsRevenue: 200,
      payouts: 360,
      margin: 238,
      marginPercent: 39.8,
    });
    expect(paid.totals).toMatchObject({ jobs: 2, revenue: 3824, payouts: 2285, margin: 1539, marginPercent: 40.2 });

    // Covered visit: the customer paid nothing; the payout is NCC's cost
    // (recoverable from the brand), reported apart from paid work.
    expect(covered.totals).toMatchObject({ jobs: 1, revenue: 0, payouts: 350, margin: -350, marginPercent: null });
  });

  it('by offering, partner and day', async () => {
    const byOffering = (await report('?groupBy=offering&coverage=paid').expect(200)).body.data;
    expect(byOffering.covered).toBeNull();
    expect(byOffering.paid.groups.map((g) => g.key).sort()).toEqual(['AC-SPLIT-15T-INSTALL', 'ELEC-FAN-INSTALL']);

    const byPartner = (await report('?groupBy=partner').expect(200)).body.data;
    expect(byPartner.paid.groups.find((g) => g.label === 'Partner A')).toMatchObject({ jobs: 1, payouts: 1925 });

    const byDay = (await report('?groupBy=day').expect(200)).body.data;
    expect(byDay.paid.groups).toHaveLength(1);
    expect(byDay.paid.groups[0].key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('filters by completion date', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    expect((await report(`?from=${today}&to=${today}`).expect(200)).body.data.paid.totals.jobs).toBe(2);
    expect((await report('?to=2020-01-01').expect(200)).body.data.paid.totals.jobs).toBe(0);
    expect(await Booking.countDocuments({ status: 'Completed', completedAt: { $ne: null } })).toBe(3);
  });

  it('is super-admin only and validates its query', async () => {
    const customer = await flow.customer();
    await request(app).get('/api/v1/super-admin/reports/margin').set('Authorization', `Bearer ${customer.token}`).expect(403);
    await report('?groupBy=brand').expect(400);
    await report('?from=25-09-2026').expect(400);
  });
});
