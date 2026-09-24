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
import { signForTesting } from '../src/modules/payments-wallet/paymentGateway.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { createRateVersion } from '../src/modules/catalog/rateWriter.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { seedTestCatalogue, clearCatalogue, offeringBooking } from './helpers/catalogue.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

// Fixed partner payout end to end on the real seeded catalogue
// (docs/master-catalogue Phase 5): booking → accept → work → bill → collect →
// what the partner is credited, and what the customer is billed.

const TEST_DB_URI = testDbUri('partner_payout');
let app;
let phoneSeq = 9300100000;
const nextPhone = () => String(phoneSeq++);

async function loginAndVerify({ role, identifier }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password: 'password123' }).expect(200);
  const res = await request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ role, identifier, code: readOtpCode(identifier) })
    .expect(200);
  return res.body.data.accessToken;
}

async function partner(specs) {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.SERVICE_PROVIDER, phone, name: 'Payout Partner', passwordHash: await hashPassword('password123') });
  const serviceProvider = await ServiceProvider.create({ user: user._id, name: 'Payout Partner', phone, status: 'Active', availability: 'Available', specs });
  return { serviceProvider, token: await loginAndVerify({ role: ROLES.SERVICE_PROVIDER, identifier: phone }) };
}

async function customer() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.CUSTOMER, phone, name: 'Payout Customer', passwordHash: await hashPassword('password123') });
  return { user, token: await loginAndVerify({ role: ROLES.CUSTOMER, identifier: phone }) };
}

/** Books `code`, has the partner accept it, and walks it to billing. Returns job + billing. */
async function jobToBilling(code, { specs, bookingOptions = {}, beforeWork } = {}) {
  const sp = await partner(specs);
  const cust = await customer();
  const body = await offeringBooking(code, { userId: String(cust.user._id), ...bookingOptions });
  const booked = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust.token}`).send(body).expect(201);
  const { booking, serviceRequest, razorpay } = booked.body.data;

  const auth = { Authorization: `Bearer ${sp.token}` };
  const accepted = await request(app).post(`/api/v1/service-provider/jobs/accept/${serviceRequest.id}`).set(auth).send({}).expect(200);
  const jobId = accepted.body.data.id;

  if (beforeWork) await beforeWork({ jobId, auth, booking, razorpay, custToken: cust.token });
  await request(app).post(`/api/v1/service-provider/jobs/${jobId}/start-travel`).set(auth).expect(200);
  await request(app).post(`/api/v1/service-provider/jobs/${jobId}/arrive`).set(auth).expect(200);
  await request(app).post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'ok' }).expect(200);
  return { jobId, auth, sp, booking, serviceRequest, accepted: accepted.body.data };
}

async function billAndCollect({ jobId, auth, serviceRequest, parts = [] }) {
  await request(app).post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`).set(auth).send({ parts }).expect(200);
  await request(app).post(`/api/v1/service-provider/jobs/${jobId}/repair-complete`).set(auth).expect(200);
  const billing = (await request(app).post(`/api/v1/service-provider/jobs/${jobId}/billing`).set(auth).expect(200)).body.data.billingEstimate;
  const sr = await ServiceRequest.findById(serviceRequest.id).populate('booking');
  const paid = await request(app)
    .post(`/api/v1/service-provider/jobs/${jobId}/collect-payment`)
    .set(auth)
    .send({ paymentMethod: 'Cash', otp: sr.booking.completionOtp })
    .expect(200);
  return { billing, payment: paid.body.data.payment };
}

const tallyOf = async (sp) => (await EarningsTally.findOne({ serviceProvider: sp.serviceProvider._id }))?.total;

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
  await Promise.all([User, ServiceProvider, Booking, ServiceRequest, Job, EarningsTally, Payment].map((m) => m.deleteMany({})));
  await seedTestCatalogue();
});

const fanType = { requiredInfo: [{ key: 'fan_type', value: 'Ceiling' }] };

describe('fixed partner payout', () => {
  it('client Test 9: Fan × 2 — customer billed ₹705.64, partner credited ₹360', async () => {
    const flow = await jobToBilling('ELEC-FAN-INSTALL', { specs: ['Electrician'], bookingOptions: { quantity: 2, ...fanType } });
    expect(flow.accepted.payout).toEqual({ base: 360, expressIncentive: 0, addOns: 0, total: 360 });
    expect(flow.accepted.estEarnings).toBe(360);

    const { billing, payment } = await billAndCollect(flow);
    expect(billing).toMatchObject({ serviceCharge: 705.64, total: 705.64, amountToCollect: 705.64, serviceProviderEarnings: 360 });
    expect(payment.amount).toBe(705.64);
    expect(await tallyOf(flow.sp)).toBe(360);
  });

  it('the booked service is billed exactly as booked — GST is not added a second time', async () => {
    const flow = await jobToBilling('TV-LED-55-65-INSTALL', { specs: ['TV'] });
    const { billing } = await billAndCollect(flow);
    expect(billing.total).toBe(942.82);
    expect(billing.serviceProviderEarnings).toBe(450);
  });

  it('express adds the configured incentive: Fan × 2 ASAP → ₹410', async () => {
    const flow = await jobToBilling('ELEC-FAN-INSTALL', { specs: ['Electrician'], bookingOptions: { quantity: 2, timeGroup: 'ASAP', ...fanType } });
    expect(flow.accepted.payout).toMatchObject({ base: 360, expressIncentive: 50, total: 410 });
    const { billing } = await billAndCollect(flow);
    expect(billing).toMatchObject({ total: 822.46, serviceProviderEarnings: 410 });
    expect(await tallyOf(flow.sp)).toBe(410);
  });

  it('a warranty-covered booking: customer pays ₹0, partner still earns the offering payout (A5)', async () => {
    const purchaseDate = new Date(Date.now() - 30 * 86400000).toISOString();
    const flow = await jobToBilling('AC-WINDOW-INSTALL', {
      specs: ['AC'],
      bookingOptions: { purchaseDate, coverageType: 'Brand Warranty' },
    });
    expect(flow.booking.totalPrice).toBe(0);
    expect(flow.accepted.type).toBe('Brand Warranty');
    const { billing } = await billAndCollect(flow);
    expect(billing).toMatchObject({ total: 0, serviceProviderEarnings: 350 });
    expect(await tallyOf(flow.sp)).toBe(350);
  });

  it('client Test 8: a customer-price change after booking does not change the payout', async () => {
    const flow = await jobToBilling('TV-LED-55-65-INSTALL', {
      specs: ['TV'],
      beforeWork: async () => {
        const offering = await ServiceOffering.findOne({ code: 'TV-LED-55-65-INSTALL' });
        await createRateVersion(offering._id, { customerPrice: 89900 }, { reason: 'Festive' });
      },
    });
    const { billing } = await billAndCollect(flow);
    expect(billing).toMatchObject({ total: 942.82, serviceProviderEarnings: 450 });
  });

  it('a payout change after booking does not change an existing job either', async () => {
    const flow = await jobToBilling('TV-LED-55-65-INSTALL', {
      specs: ['TV'],
      beforeWork: async () => {
        const offering = await ServiceOffering.findOne({ code: 'TV-LED-55-65-INSTALL' });
        await createRateVersion(offering._id, { spPayout: 50000 }, { reason: 'Partner rate revision' });
      },
    });
    const { billing } = await billAndCollect(flow);
    expect(billing.serviceProviderEarnings).toBe(450);
  });
});

describe('on-site add-ons from the catalogue', () => {
  it('Switch Installation × 3 on an AC job: priced with GST once, payout added, parts earn nothing', async () => {
    const flow = await jobToBilling('AC-WINDOW-INSTALL', { specs: ['AC'] });
    const list = await request(app).get(`/api/v1/service-provider/jobs/${flow.jobId}/addon-offerings?category=Electrician`).set(flow.auth).expect(200);
    const sw = list.body.data.find((o) => o.code === 'ELEC-SWITCH-INSTALL');
    expect(sw).toMatchObject({ customerPrice: 99, spPayout: 60 });

    const added = await request(app).post(`/api/v1/service-provider/jobs/${flow.jobId}/addons`).set(flow.auth).send({ offeringId: sw.id, quantity: 3 }).expect(200);
    expect(added.body.data.additionalServices[0]).toMatchObject({ code: 'ELEC-SWITCH-INSTALL', quantity: 3, finalAmount: 350.46, spPayout: 180 });
    expect(added.body.data.payout).toMatchObject({ base: 350, addOns: 180, total: 530 });

    const { billing } = await billAndCollect({ ...flow, parts: [{ name: 'Capacitor', price: 200, checked: true }] });
    // 706.82 booked + 350.46 add-on (297 + 18%) + 236 parts (200 + 18%)
    expect(billing).toMatchObject({ serviceCharge: 706.82, additionalServicesTotal: 350.46, sparePartsTotal: 236, total: 1293.28, serviceProviderEarnings: 530 });
    expect(await tallyOf(flow.sp)).toBe(530);
  });

  it('add-ons needing a size are not offered; removed add-ons stop counting; closed after billing', async () => {
    const flow = await jobToBilling('AC-WINDOW-INSTALL', { specs: ['AC'] });
    const list = (await request(app).get(`/api/v1/service-provider/jobs/${flow.jobId}/addon-offerings`).set(flow.auth).expect(200)).body.data;
    expect(list.map((o) => o.code)).not.toContain('AC-SPLIT-UNINSTALL'); // needs a Split AC size
    expect(list.map((o) => o.code)).toContain('AC-SPLIT-15T-INSTALL');

    const winUn = list.find((o) => o.code === 'AC-WINDOW-UNINSTALL');
    const added = await request(app).post(`/api/v1/service-provider/jobs/${flow.jobId}/addons`).set(flow.auth).send({ offeringId: winUn.id }).expect(200);
    const addOnId = added.body.data.additionalServices[0].id ?? added.body.data.additionalServices[0]._id;
    const removed = await request(app).delete(`/api/v1/service-provider/jobs/${flow.jobId}/addons/${addOnId}`).set(flow.auth).expect(200);
    expect(removed.body.data.payout.total).toBe(350);

    const { billing } = await billAndCollect(flow);
    expect(billing).toMatchObject({ additionalServicesTotal: 0, serviceProviderEarnings: 350 });
    await request(app).post(`/api/v1/service-provider/jobs/${flow.jobId}/addons`).set(flow.auth).send({ offeringId: winUn.id }).expect(400);
  });
});

describe('partner job summary (job context)', () => {
  it('shows the exact service, answers, instructions, payout and amount to collect — never margin', async () => {
    const flow = await jobToBilling('ELEC-FAN-INSTALL', { specs: ['Electrician'], bookingOptions: { quantity: 2, timeGroup: 'ASAP', ...fanType } });
    const res = await request(app).get(`/api/v1/service-provider/jobs/${flow.jobId}/context`).set(flow.auth).expect(200);
    const { jobSummary } = res.body.data;
    expect(jobSummary).toMatchObject({
      serviceName: 'Fan Installation',
      quantity: 2,
      unitLabel: 'per fan',
      isExpress: true,
      requiredInfo: [{ key: 'fan_type', label: 'Fan type', value: 'Ceiling' }],
      customerAmount: { bookingTotal: 822.46, alreadyPaid: 0, toCollect: 822.46 },
      payout: { base: 360, expressIncentive: 50, addOns: 0, total: 410 },
    });
    expect(jobSummary.included.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body.data)).not.toMatch(/margin/i);
  });
});

describe('what the partner collects', () => {
  it('a verified advance is not collected twice', async () => {
    const flow = await jobToBilling('TV-LED-55-65-INSTALL', {
      specs: ['TV'],
      bookingOptions: { paymentMode: 'advance', paymentMethod: 'UPI' },
      beforeWork: async ({ booking, razorpay, custToken }) => {
        const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_adv' });
        await request(app)
          .post(`/api/v1/bookings/${booking.id}/verify-payment`)
          .set('Authorization', `Bearer ${custToken}`)
          .send({ razorpayPaymentId: 'pay_adv', razorpaySignature: signature })
          .expect(200);
      },
    });
    expect(flow.booking.advanceAmount).toBe(188.56);
    const { billing, payment } = await billAndCollect(flow);
    expect(billing).toMatchObject({ total: 942.82, alreadyPaid: 188.56, amountToCollect: 754.26 });
    expect(payment.amount).toBe(754.26);
  });

  it('the pre-accept estimate shown to partners is the fixed payout', async () => {
    const sp = await partner(['TV']);
    const cust = await customer();
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${cust.token}`)
      .send(await offeringBooking('TV-LED-32-INSTALL'))
      .expect(201);
    const available = await request(app).get('/api/v1/service-provider/jobs/available').set('Authorization', `Bearer ${sp.token}`).expect(200);
    expect(available.body.data[0].estEarnings).toBe(200);
  });
});
