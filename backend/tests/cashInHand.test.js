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
import { EarningsTally } from '../src/modules/service-provider/earningsTally.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { seedTestCatalogue, clearCatalogue } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// A partner who takes cash from the customer holds company money. That cash
// used to vanish from the books: the job was marked paid, the partner was
// credited their payout, and nothing recorded that they still held the cash.

let app;
const { loginAndVerify, jobToBilling, billAndCollect } = jobFlow(() => app);

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('cash_in_hand'));
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
  await Promise.all([User, ServiceProvider, Booking, ServiceRequest, Job, EarningsTally, Payment].map((m) => m.deleteMany({})));
  await seedTestCatalogue();
});

async function adminToken() {
  const email = 'cash.admin@example.com';
  await User.create({ role: ROLES.SUPER_ADMIN, name: 'Super Admin', email, passwordHash: await hashPassword('password123'), status: 'Active' });
  return loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: email, password: 'password123' });
}

describe('cash collected by a partner', () => {
  it('is tracked as cash in hand, shown to the partner, and cleared when the partner hands it over', async () => {
    const flow = await jobToBilling('TV-LED-32-INSTALL', { specs: ['TV'] });
    const { payment } = await billAndCollect(flow);
    expect(payment.method).toBe('Cash');
    expect(payment.amount).toBeGreaterThan(0);

    const holder = await ServiceProvider.findById(flow.sp.serviceProvider._id);
    expect(holder.cashCollected).toBe(payment.amount);
    expect(holder.cashRemitted).toBe(0);

    // The partner sees what they owe.
    const breakdown = await request(app).get('/api/v1/service-provider/earnings/breakdown').set(flow.auth).expect(200);
    expect(breakdown.body.data.cashInHand).toBe(payment.amount);

    // Admin records a hand-over: part first, then the rest; more than is held is refused.
    const admin = await adminToken();
    const auth = { Authorization: `Bearer ${admin}` };
    const url = `/api/v1/super-admin/service-providers/${flow.sp.serviceProvider.id}/cash-remittance`;
    const part = Math.round(payment.amount / 2);
    const first = await request(app).post(url).set(auth).send({ amount: part, note: 'Handed at office' }).expect(200);
    expect(first.body.data.cashInHand).toBe(Math.round((payment.amount - part) * 100) / 100);
    await request(app).post(url).set(auth).send({ amount: payment.amount }).expect(409);
    const rest = await request(app).post(url).set(auth).send({ amount: first.body.data.cashInHand }).expect(200);
    expect(rest.body.data.cashInHand).toBe(0);

    // Only a super-admin may record it.
    await request(app).post(url).set(flow.auth).send({ amount: 1 }).expect(403);
  });
});
