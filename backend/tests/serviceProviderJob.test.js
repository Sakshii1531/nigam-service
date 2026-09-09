import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { ServiceCatalogItem } from '../src/modules/catalog/serviceCatalogItem.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Job } from '../src/modules/technician/job.model.js';
import { EarningsTally } from '../src/modules/technician/earningsTally.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { RateCard } from '../src/modules/brand-admin/rateCard.model.js';
import { PlatformSettings } from '../src/modules/super-admin/platformSettings.model.js';
import { Payout } from '../src/modules/technician/payout.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { signForTesting } from '../src/modules/payments-wallet/paymentGateway.js';
import { Claim } from '../src/modules/warranty-amc-exchange/claim.model.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { AMCVisit } from '../src/modules/warranty-amc-exchange/amcVisit.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('technicianJob');

let app;
let phoneCounter = 9400000000;
function nextPhone() {
  return String(phoneCounter++);
}


async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

async function seedCatalog() {
  const category = await Category.create({ key: 'AC', name: 'AC', color: '#0D47A1' });
  await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
  await ServiceCatalogItem.create({ category: category._id, slug: 'repair', name: 'Repair', price: 1000 });
}

async function seedCustomer(phone = nextPhone()) {
  const user = await User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('password123') });
  const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
  return { user, token };
}

async function seedTechnician({ phone = nextPhone(), specs = ['AC'], availability = 'Available' } = {}) {
  const user = await User.create({ role: ROLES.TECHNICIAN, phone, name: 'Test Technician', passwordHash: await hashPassword('password123') });
  const technician = await Technician.create({ user: user._id, name: 'Test Technician', phone, status: 'Active', availability, specs });
  const token = await loginAndVerify({ role: ROLES.TECHNICIAN, identifier: phone, password: 'password123' });
  return { technician, token };
}

/** A D2C job, accepted and sitting at 'assigned' — the starting point most job-step tests build on. */
async function createAcceptedD2CJob() {
  await seedCatalog();
  const { technician, token: techToken } = await seedTechnician();
  const { token: custToken } = await seedCustomer();

  const bookingRes = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${custToken}`)
    .send({ category: 'AC', serviceSlug: 'repair' })
    .expect(201);
  const srId = bookingRes.body.data.serviceRequest.id;

  const acceptRes = await request(app)
    .post(`/api/v1/tech/jobs/accept/${srId}`)
    .set('Authorization', `Bearer ${techToken}`)
    .send({})
    .expect(200);

  return { jobId: acceptRes.body.data.id, srId, technician, techToken, custToken };
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
    Technician.deleteMany({}),
    Category.deleteMany({}),
    ProductType.deleteMany({}),
    ServiceCatalogItem.deleteMany({}),
    Booking.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Job.deleteMany({}),
    EarningsTally.deleteMany({}),
    Brand.deleteMany({}),
    RateCard.deleteMany({}),
    PlatformSettings.deleteMany({}),
    Payout.deleteMany({}),
    Payment.deleteMany({}),
    Claim.deleteMany({}),
    AMCPlan.deleteMany({}),
    AMCSubscription.deleteMany({}),
    AMCVisit.deleteMany({}),
    ExtendedWarrantyOrder.deleteMany({}),
  ]);
});

describe('POST /tech/jobs/accept/:serviceRequestId', () => {
  it('creates a D2C job at step "assigned" and moves the ServiceRequest to "Engineer Accepted"', async () => {
    const { jobId, srId, techToken } = await createAcceptedD2CJob();
    expect(jobId).toBeTruthy();

    const job = await Job.findById(jobId);
    expect(job.type).toBe('NCC Paid Service');
    expect(job.isD2C).toBe(true);
    expect(job.activeStep).toBe('assigned');
    expect(job.estEarnings).toBe(300); // 30% of the 1000 catalog price

    const srRes = await request(app).get(`/api/v1/service-requests/${srId}`).set('Authorization', `Bearer ${techToken}`);
    expect(srRes.body.data.status).toBe('Engineer Accepted');

    const technician = await Technician.findOne({ user: (await User.findOne({ role: ROLES.TECHNICIAN }))._id });
    expect(technician.activeJobsCount).toBe(1);
  });

  it('rejects a second accept on the same ServiceRequest', async () => {
    const { srId, techToken } = await createAcceptedD2CJob();
    await request(app).post(`/api/v1/tech/jobs/accept/${srId}`).set('Authorization', `Bearer ${techToken}`).send({}).expect(400);
  });

  it('rejects acceptance by a technician the request is not assigned to', async () => {
    const { srId } = await createAcceptedD2CJob();
    const { token: otherToken } = await seedTechnician({ phone: nextPhone() });
    await request(app).post(`/api/v1/tech/jobs/accept/${srId}`).set('Authorization', `Bearer ${otherToken}`).send({}).expect(403);
  });

  it('rejects access from a non-technician role', async () => {
    await seedCatalog();
    const { token: custToken } = await seedCustomer();
    await request(app).post('/api/v1/tech/jobs/accept/000000000000000000000000').set('Authorization', `Bearer ${custToken}`).send({}).expect(403);
  });
});

describe('D2C job — full lifecycle to payment', () => {
  it('walks accept -> travel -> arrive -> diagnosis -> spare-parts -> repair-complete -> billing -> collect-payment, driving the ServiceRequest in lockstep and crediting earnings', async () => {
    const { jobId, srId, techToken, technician } = await createAcceptedD2CJob();

    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set('Authorization', `Bearer ${techToken}`).expect(200);
    let sr = await ServiceRequest.findById(srId);
    expect(sr.status).toBe('Visit Scheduled');

    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set('Authorization', `Bearer ${techToken}`).expect(200);
    sr = await ServiceRequest.findById(srId);
    expect(sr.status).toBe('Engineer Reached');

    const diagRes = await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/diagnosis`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ notes: 'Gas leak found' })
      .expect(200);
    expect(diagRes.body.data.diagnosis.notes).toBe('Gas leak found');
    sr = await ServiceRequest.findById(srId);
    expect(sr.status).toBe('Diagnosis Done');

    await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/spare-parts`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ parts: [{ name: 'Gas Refill Kit', price: 500, checked: true }], additionalServices: [{ name: 'Extra Cleaning', price: 100, checked: true }] })
      .expect(200);
    sr = await ServiceRequest.findById(srId);
    // D2C parts don't create claims, but the SR still passes through the spare pipeline.
    expect(sr.status).toBe('Spare Received');
    expect(await Claim.countDocuments({})).toBe(0);

    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set('Authorization', `Bearer ${techToken}`).expect(200);
    sr = await ServiceRequest.findById(srId);
    expect(sr.status).toBe('Repair Completed');

    const billingRes = await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set('Authorization', `Bearer ${techToken}`).expect(200);
    const { billingEstimate } = billingRes.body.data;
    expect(billingEstimate.serviceCharge).toBe(1000);
    expect(billingEstimate.sparePartsTotal).toBe(500);
    expect(billingEstimate.additionalServicesTotal).toBe(100);
    const expectedSubtotal = 1000 + 500 + 100;
    expect(billingEstimate.technicianEarnings).toBe(Math.round(expectedSubtotal * 0.3));
    const expectedTotal = Math.round(expectedSubtotal * 1.18 * 100) / 100;
    expect(billingEstimate.total).toBeCloseTo(expectedTotal, 2);

    const payRes = await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/collect-payment`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ paymentMethod: 'Cash' })
      .expect(200);
    expect(payRes.body.data.job.activeStep).toBe('completed');
    expect(payRes.body.data.payment.amount).toBeCloseTo(expectedTotal, 2);
    expect(payRes.body.data.payment.status).toBe('Success');

    sr = await ServiceRequest.findById(srId);
    expect(sr.status).toBe('Customer Confirmation');

    const payment = await Payment.findOne({ targetType: 'job', targetId: jobId });
    expect(payment).toBeTruthy();

    const tally = await EarningsTally.findOne({ technician: technician._id });
    expect(tally.total).toBe(billingEstimate.technicianEarnings);
    expect(tally.completedTotal).toBe(1);

    const updatedTechnician = await Technician.findById(technician._id);
    expect(updatedTechnician.activeJobsCount).toBe(0);
    expect(updatedTechnician.completedJobsCount).toBe(1);
  });

  it('collecting payment with a real gateway method (Card) moves the job to awaitingpayment and returns a Razorpay order; verifying it then completes the job and credits earnings', async () => {
    const { jobId, srId, techToken, technician } = await createAcceptedD2CJob();

    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set('Authorization', `Bearer ${techToken}`).send({});
    await request(app).post(`/api/v1/tech/jobs/${jobId}/spare-parts`).set('Authorization', `Bearer ${techToken}`).send({ parts: [] });
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set('Authorization', `Bearer ${techToken}`);
    const billingRes = await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set('Authorization', `Bearer ${techToken}`);
    const expectedTotal = billingRes.body.data.billingEstimate.total;
    expect(expectedTotal).toBeGreaterThan(0);

    const initiateRes = await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/collect-payment`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ paymentMethod: 'Card' })
      .expect(200);
    expect(initiateRes.body.data.job.activeStep).toBe('awaitingpayment');
    expect(initiateRes.body.data.payment).toBeNull();
    expect(initiateRes.body.data.razorpay.orderId).toBeTruthy();

    const pendingPayment = await Payment.findOne({ targetType: 'job', targetId: jobId });
    expect(pendingPayment.status).toBe('Pending');

    // Job stays put until the customer actually completes Checkout.js.
    let job = await Job.findById(jobId);
    expect(job.activeStep).toBe('awaitingpayment');

    const razorpaySignature = signForTesting({ orderId: initiateRes.body.data.razorpay.orderId, paymentId: 'pay_test_job_1' });
    const verifyRes = await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/verify-payment`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ razorpayPaymentId: 'pay_test_job_1', razorpaySignature })
      .expect(200);
    expect(verifyRes.body.data.job.activeStep).toBe('completed');
    expect(verifyRes.body.data.payment.status).toBe('Success');
    expect(verifyRes.body.data.payment.amount).toBeCloseTo(expectedTotal, 2);

    job = await Job.findById(jobId);
    expect(job.activeStep).toBe('completed');

    const sr = await ServiceRequest.findById(srId);
    expect(sr.status).toBe('Customer Confirmation');

    const tally = await EarningsTally.findOne({ technician: technician._id });
    expect(tally.completedTotal).toBe(1);
  });

  it('rejects verifying a job payment with an invalid signature, leaving the job at awaitingpayment', async () => {
    const { jobId, techToken } = await createAcceptedD2CJob();

    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set('Authorization', `Bearer ${techToken}`).send({});
    await request(app).post(`/api/v1/tech/jobs/${jobId}/spare-parts`).set('Authorization', `Bearer ${techToken}`).send({ parts: [] });
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set('Authorization', `Bearer ${techToken}`);

    await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/collect-payment`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ paymentMethod: 'UPI' })
      .expect(200);

    await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/verify-payment`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ razorpayPaymentId: 'pay_test_wrong', razorpaySignature: 'not-a-real-signature' })
      .expect(400);

    const job = await Job.findById(jobId);
    expect(job.activeStep).toBe('awaitingpayment');
  });

  it('rejects an out-of-order action (e.g. collect-payment before billing) with 400', async () => {
    const { jobId, techToken } = await createAcceptedD2CJob();
    await request(app).post(`/api/v1/tech/jobs/${jobId}/collect-payment`).set('Authorization', `Bearer ${techToken}`).send({}).expect(400);
  });

  it('rejects diagnosis submission before the technician has arrived', async () => {
    const { jobId, techToken } = await createAcceptedD2CJob();
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set('Authorization', `Bearer ${techToken}`).send({ notes: 'x' }).expect(400);
  });

  it('rejects access to a job owned by a different technician', async () => {
    const { jobId } = await createAcceptedD2CJob();
    const { token: otherToken } = await seedTechnician({ phone: nextPhone() });
    await request(app).get(`/api/v1/tech/jobs/${jobId}`).set('Authorization', `Bearer ${otherToken}`).expect(403);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set('Authorization', `Bearer ${otherToken}`).expect(403);
  });
});

describe('AMC-covered job — FOC claims and subscription decrement', () => {
  async function createAcceptedAmcJob() {
    const { technician, token: techToken } = await seedTechnician();
    const { user: customer } = await seedCustomer();

    const plan = await AMCPlan.create({ name: 'AMC Gold Plan', tier: 'Gold', price: 2499, visitsTotal: 4 });
    const subscription = await AMCSubscription.create({
      user: customer._id,
      plan: plan._id,
      brand: 'LG',
      model: 'Double Door 260L',
      expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      visitsTotal: 4,
      visitsRemaining: 4,
      visitNumber: 1,
    });

    const sr = await ServiceRequest.create({
      user: customer._id,
      technician: technician._id,
      category: 'Refrigerator',
      description: 'AMC visit',
      status: 'Assigned',
      timeline: [{ stepLabel: 'New', done: true }, { stepLabel: 'Assigned', done: true }],
    });

    const acceptRes = await request(app)
      .post(`/api/v1/tech/jobs/accept/${sr.id}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ type: 'AMC Visit', amcSubscriptionId: subscription.id })
      .expect(200);

    return { jobId: acceptRes.body.data.id, srId: sr.id, technician, techToken, subscription };
  }

  it('links the AMC subscription onto the job and defaults to the flat covered-visit earnings', async () => {
    const { jobId } = await createAcceptedAmcJob();
    const job = await Job.findById(jobId);
    expect(job.isD2C).toBe(false);
    expect(job.amc.planName).toBe('AMC Gold Plan');
    expect(job.estEarnings).toBe(150);
  });

  it('decrements AMCSubscription.visitsRemaining and creates a Completed AMCVisit on payment collection, crediting the flat visit earnings (and raises a FOC claim per checked spare part along the way, billing the customer nothing for parts)', async () => {
    const { jobId, techToken, technician, subscription } = await createAcceptedAmcJob();

    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set('Authorization', `Bearer ${techToken}`).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set('Authorization', `Bearer ${techToken}`).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set('Authorization', `Bearer ${techToken}`).send({ notes: 'Compressor issue' }).expect(200);

    const sparePartsRes = await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/spare-parts`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ parts: [{ name: 'Compressor Unit', price: 1500, checked: true }] })
      .expect(200);
    expect(sparePartsRes.body.data.activeStep).toBe('spareapproval');

    const claims = await Claim.find({ raisedByModel: 'Technician', raisedBy: technician._id });
    expect(claims).toHaveLength(1);
    expect(claims[0].amount).toBe(1500);
    expect(claims[0].claimType).toBe('Warehouse Order');
    expect(claims[0].status).toBe('Pending Approval');

    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set('Authorization', `Bearer ${techToken}`).expect(200);
    const billingRes = await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set('Authorization', `Bearer ${techToken}`).expect(200);
    expect(billingRes.body.data.billingEstimate.sparePartsTotal).toBe(0); // covered — no charge to the customer
    expect(billingRes.body.data.billingEstimate.total).toBe(0);
    expect(billingRes.body.data.billingEstimate.technicianEarnings).toBe(150);

    await request(app).post(`/api/v1/tech/jobs/${jobId}/collect-payment`).set('Authorization', `Bearer ${techToken}`).send({}).expect(200);

    const updatedSubscription = await AMCSubscription.findById(subscription._id);
    expect(updatedSubscription.visitsRemaining).toBe(3);
    expect(updatedSubscription.visitNumber).toBe(2);

    const visits = await AMCVisit.find({ subscription: subscription._id });
    expect(visits).toHaveLength(1);
    expect(visits[0].status).toBe('Completed');
    expect(String(visits[0].technician)).toBe(String(technician._id));

    const tally = await EarningsTally.findOne({ technician: technician._id });
    expect(tally.total).toBe(150);
  });

  it('rejects linking an AMC subscription that belongs to a different customer than the service request (IDOR fix)', async () => {
    const { technician, token: techToken } = await seedTechnician();
    const { user: srCustomer } = await seedCustomer();
    const { user: otherCustomer } = await seedCustomer();

    const plan = await AMCPlan.create({ name: 'AMC Gold Plan', tier: 'Gold', price: 2499, visitsTotal: 4 });
    const subscription = await AMCSubscription.create({
      user: otherCustomer._id, // belongs to a DIFFERENT customer than the service request below
      plan: plan._id,
      brand: 'LG',
      model: 'Double Door 260L',
      expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      visitsTotal: 4,
      visitsRemaining: 4,
      visitNumber: 1,
    });

    const sr = await ServiceRequest.create({
      user: srCustomer._id,
      technician: technician._id,
      category: 'Refrigerator',
      description: 'AMC visit',
      status: 'Assigned',
      timeline: [{ stepLabel: 'New', done: true }, { stepLabel: 'Assigned', done: true }],
    });

    await request(app)
      .post(`/api/v1/tech/jobs/accept/${sr.id}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ type: 'AMC Visit', amcSubscriptionId: subscription.id })
      .expect(403);

    expect(await Job.countDocuments({})).toBe(0);
  });

  it('rejects linking an Extended Warranty order that belongs to a different customer than the service request (IDOR fix)', async () => {
    const { technician, token: techToken } = await seedTechnician();
    const { user: srCustomer } = await seedCustomer();
    const { user: otherCustomer } = await seedCustomer();

    const ewOrder = await ExtendedWarrantyOrder.create({
      user: otherCustomer._id, // belongs to a DIFFERENT customer than the service request below
      applianceCategory: 'AC',
      brand: 'LG',
      price: 1999,
      validTill: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      claimsRemaining: 2,
      claimsTotal: 2,
    });

    const sr = await ServiceRequest.create({
      user: srCustomer._id,
      technician: technician._id,
      category: 'AC',
      description: 'EW visit',
      status: 'Assigned',
      timeline: [{ stepLabel: 'New', done: true }, { stepLabel: 'Assigned', done: true }],
    });

    await request(app)
      .post(`/api/v1/tech/jobs/accept/${sr.id}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ type: 'NCC Extended Warranty', extendedWarrantyOrderId: ewOrder.id })
      .expect(403);

    expect(await Job.countDocuments({})).toBe(0);
  });
});

describe('technician claims module', () => {
  it('lets a technician manually raise a claim and read it back, but not another technician\'s claim', async () => {
    const { technician: techA, token: tokenA } = await seedTechnician({ phone: nextPhone() });
    const { token: tokenB } = await seedTechnician({ phone: nextPhone() });

    const raiseRes = await request(app)
      .post('/api/v1/tech/claims')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ brand: 'LG Partner Warranty', claimType: 'Brand', item: 'Fan Blade', amount: 250, reason: 'Damaged in transit' })
      .expect(201);
    const claimId = raiseRes.body.data.id;

    const listRes = await request(app).get('/api/v1/tech/claims').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].raisedBy).toBe(techA.id);

    await request(app).get(`/api/v1/tech/claims/${claimId}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    await request(app).get(`/api/v1/tech/claims/${claimId}`).set('Authorization', `Bearer ${tokenB}`).expect(403);

    const listResB = await request(app).get('/api/v1/tech/claims').set('Authorization', `Bearer ${tokenB}`).expect(200);
    expect(listResB.body.data).toHaveLength(0);
  });
});

describe('earnings + payouts', () => {
  it('rejects a payout with no payout method on file', async () => {
    const { jobId, techToken } = await createAcceptedD2CJob();
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set('Authorization', `Bearer ${techToken}`);
    await request(app)
      .post('/api/v1/tech/earnings/payouts')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ amount: 100 })
      .expect(400);
  });

  it('rejects a payout that exceeds the earned balance, leaving the tally untouched', async () => {
    const { techToken } = await createAcceptedD2CJob();
    await request(app)
      .post('/api/v1/tech/profile/payout-methods')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ type: 'upi', upiId: 'tech@upi', isPrimary: true })
      .expect(200);

    await request(app)
      .post('/api/v1/tech/earnings/payouts')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ amount: 999999 })
      .expect(400);
  });

  it('debits the earnings tally and settles a Quick payout, crediting the masked primary method', async () => {
    const { jobId, techToken, technician } = await createAcceptedD2CJob();

    await request(app)
      .post('/api/v1/tech/profile/payout-methods')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ type: 'upi', upiId: 'tech@upi', isPrimary: true })
      .expect(200);

    // Fast-forward the job to completion to have a real earned balance to pay out.
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set('Authorization', `Bearer ${techToken}`).send({});
    await request(app).post(`/api/v1/tech/jobs/${jobId}/spare-parts`).set('Authorization', `Bearer ${techToken}`).send({ parts: [] });
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set('Authorization', `Bearer ${techToken}`);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/collect-payment`).set('Authorization', `Bearer ${techToken}`).send({});

    const tallyBefore = await EarningsTally.findOne({ technician: technician._id });
    expect(tallyBefore.total).toBe(300);

    const payoutRes = await request(app)
      .post('/api/v1/tech/earnings/payouts')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ amount: 200, payoutType: 'Quick' })
      .expect(201);
    expect(payoutRes.body.data.status).toBe('Settled');
    expect(payoutRes.body.data.platformFee).toBe(4); // 2% of 200
    expect(payoutRes.body.data.netAmount).toBe(196);
    expect(payoutRes.body.data.creditedTo).toBe('tech@upi');

    const tallyAfter = await EarningsTally.findOne({ technician: technician._id });
    expect(tallyAfter.total).toBe(100);

    const listRes = await request(app).get('/api/v1/tech/earnings/payouts').set('Authorization', `Bearer ${techToken}`).expect(200);
    expect(listRes.body.data).toHaveLength(1);
  });
});

describe('inventory + part orders', () => {
  it('lets a technician place a part order and read it back, scoped to their own technician id', async () => {
    const { token: tokenA } = await seedTechnician({ phone: nextPhone() });
    const { token: tokenB } = await seedTechnician({ phone: nextPhone() });

    const orderRes = await request(app)
      .post('/api/v1/tech/inventory/part-orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ partName: 'Fan Motor', qty: 1, price: 350, orderSource: 'NCC Warehouse' })
      .expect(201);
    expect(orderRes.body.data.status).toBe('Pending');

    const listA = await request(app).get('/api/v1/tech/inventory/part-orders').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(listA.body.data).toHaveLength(1);

    const listB = await request(app).get('/api/v1/tech/inventory/part-orders').set('Authorization', `Bearer ${tokenB}`).expect(200);
    expect(listB.body.data).toHaveLength(0);
  });
});

describe('recent earnings + analytics', () => {
  /** Runs an accepted D2C job all the way to completed so it has real earnings. */
  async function completeJob() {
    const { jobId, techToken } = await createAcceptedD2CJob();
    const auth = { Authorization: `Bearer ${techToken}` };
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'Gas leak found' }).expect(200);
    // The step machine routes through the spare pipeline even when nothing is used.
    await request(app).post(`/api/v1/tech/jobs/${jobId}/spare-parts`).set(auth).send({ parts: [], additionalServices: [] }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/collect-payment`).set(auth).send({ paymentMethod: 'Cash' }).expect(200);
    return { jobId, techToken };
  }

  it('lists completed jobs with their earnings, newest first', async () => {
    const { jobId, techToken } = await completeJob();

    const res = await request(app)
      .get('/api/v1/tech/earnings/recent')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(jobId);
    expect(res.body.data[0].amount).toBeGreaterThan(0);
    expect(res.body.data[0].completedAt).toBeTruthy();
  });

  it('excludes jobs that have not been completed', async () => {
    const { techToken } = await createAcceptedD2CJob();
    const res = await request(app)
      .get('/api/v1/tech/earnings/recent')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('summarises the window and splits completed jobs by category', async () => {
    const { techToken } = await completeJob();

    const res = await request(app)
      .get('/api/v1/tech/earnings/analytics?days=30')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    const data = res.body.data;
    expect(data.completedCount).toBe(1);
    expect(data.earnings).toBeGreaterThan(0);
    expect(data.completionRate).toBe(100);
    expect(data.byCategory).toEqual([{ label: 'AC', count: 1, percent: 100 }]);
    // No prior window to compare against, so the deltas are null, not 0.
    expect(data.earningsChangePercent).toBeNull();
    expect(data.previousCompletionRate).toBeNull();
  });

  it('reports a null completion rate when no job was assigned in the window', async () => {
    const { token } = await seedTechnician({ phone: '9390000091' });
    const res = await request(app)
      .get('/api/v1/tech/earnings/analytics?days=7')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toMatchObject({ completedCount: 0, earnings: 0, completionRate: null });
    expect(res.body.data.byCategory).toEqual([]);
  });

  it('rejects an unsupported window and requires a technician', async () => {
    const { token } = await seedTechnician({ phone: '9390000092' });
    await request(app)
      .get('/api/v1/tech/earnings/analytics?days=365')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    await request(app).get('/api/v1/tech/earnings/analytics').expect(401);
    await request(app).get('/api/v1/tech/earnings/recent').expect(401);
  });
});

describe('earnings breakdown', () => {
  it('splits completed work by payout type and reports the withdrawable balance', async () => {
    const { jobId, techToken } = await createAcceptedD2CJob();
    const auth = { Authorization: `Bearer ${techToken}` };
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'x' }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/spare-parts`).set(auth).send({ parts: [], additionalServices: [] }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/collect-payment`).set(auth).send({ paymentMethod: 'Cash' }).expect(200);

    const res = await request(app).get('/api/v1/tech/earnings/breakdown').set(auth).expect(200);
    const d = res.body.data;

    // A D2C job is 'NCC Paid Service', which settles as a Quick payout.
    expect(d.split.quick.jobs).toBe(1);
    expect(d.split.quick.amount).toBeGreaterThan(0);
    expect(d.split.invoice).toEqual({ amount: 0, jobs: 0 });

    // Nothing withdrawn yet, so the balance is the whole lifetime figure.
    expect(d.available).toBe(d.lifetimeEarned);
    expect(d.paidOut).toBe(0);
  });

  it('adds settled payouts back into lifetimeEarned so withdrawing does not erase history', async () => {
    const { jobId, techToken } = await createAcceptedD2CJob();
    const auth = { Authorization: `Bearer ${techToken}` };
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'x' }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/spare-parts`).set(auth).send({ parts: [], additionalServices: [] }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/collect-payment`).set(auth).send({ paymentMethod: 'Cash' }).expect(200);

    await request(app).post('/api/v1/tech/profile/payout-methods').set(auth).send({ type: 'upi', upiId: 'tech@upi', isPrimary: true }).expect(200);

    const before = (await request(app).get('/api/v1/tech/earnings/breakdown').set(auth)).body.data;
    await request(app).post('/api/v1/tech/earnings/payouts').set(auth).send({ amount: before.available }).expect(201);

    const after = (await request(app).get('/api/v1/tech/earnings/breakdown').set(auth)).body.data;
    expect(after.available).toBe(0);
    expect(after.paidOut).toBeGreaterThan(0);
    // Withdrawing moves money out of the balance but not out of history, and the
    // platform fee must not shrink the recorded lifetime figure either.
    expect(after.lifetimeEarned).toBe(before.lifetimeEarned);
    expect(after.paidOut).toBeLessThan(before.available);
  });

  it('reports zeros for a technician who has done nothing', async () => {
    const { token } = await seedTechnician({ phone: '9390000093' });
    const res = await request(app).get('/api/v1/tech/earnings/breakdown').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data).toMatchObject({ available: 0, paidOut: 0, lifetimeEarned: 0 });
    expect(res.body.data.split).toEqual({ quick: { amount: 0, jobs: 0 }, invoice: { amount: 0, jobs: 0 } });
  });
});

describe('covered-visit earnings come from the brand rate card', () => {
  it('uses the brand\'s laborRate for the appliance category', async () => {
    const brand = await Brand.create({ name: 'RateCard Brand', category: 'Appliances', status: 'Active' });
    await RateCard.create({ brand: brand._id, category: 'AC', serviceType: 'Repair', laborRate: 640 });

    const { technician, token: techToken } = await seedTechnician({ phone: '9390000101' });
    const customer = await User.create({
      role: ROLES.CUSTOMER, phone: '9290000101', name: 'Covered Customer', passwordHash: await hashPassword('password123'),
    });
    // accept requires the request to already be routed to this technician.
    const sr = await ServiceRequest.create({
      user: customer._id, technician: technician._id, brand: brand._id,
      category: 'AC', warranty: 'In Warranty', description: 'Covered repair', status: 'Assigned',
    });

    const res = await request(app)
      .post(`/api/v1/tech/jobs/accept/${sr.id}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({})
      .expect(200);

    expect(res.body.data.type).toBe('Brand Warranty');
    expect(res.body.data.estEarnings).toBe(640);
    expect(String(res.body.data.technician)).toBe(String(technician._id));
  });

  it('falls back to the default when the brand has no card for that category', async () => {
    const brand = await Brand.create({ name: 'Cardless Brand', category: 'Appliances', status: 'Active' });
    const { technician, token: techToken } = await seedTechnician({ phone: '9390000102' });
    const customer = await User.create({
      role: ROLES.CUSTOMER, phone: '9290000102', name: 'Other Customer', passwordHash: await hashPassword('password123'),
    });
    const sr = await ServiceRequest.create({
      user: customer._id, technician: technician._id, brand: brand._id,
      category: 'Refrigerator', warranty: 'In Warranty', description: 'No card', status: 'Assigned',
    });

    const res = await request(app)
      .post(`/api/v1/tech/jobs/accept/${sr.id}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({})
      .expect(200);
    expect(res.body.data.estEarnings).toBe(150);
  });
});

describe('platform settings actually drive the money', () => {
  it('uses the configured technician commission, not the 30% default', async () => {
    // The whole point: an admin changing this setting must change what a
    // technician earns. It used to be a constant the setting could not reach.
    await PlatformSettings.create({ technicianCommissionPercent: 50 });

    const { jobId, techToken } = await createAcceptedD2CJob();
    const auth = { Authorization: `Bearer ${techToken}` };
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'x' }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/spare-parts`).set(auth).send({ parts: [], additionalServices: [] }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set(auth).expect(200);

    const billing = await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set(auth).expect(200);
    const { billingEstimate } = billing.body.data;
    expect(billingEstimate.technicianEarnings).toBe(Math.round(billingEstimate.serviceCharge * 0.5));
  });

  it('falls back to 30% when no settings document exists', async () => {
    const { jobId, techToken } = await createAcceptedD2CJob();
    const auth = { Authorization: `Bearer ${techToken}` };
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set(auth).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'x' }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/spare-parts`).set(auth).send({ parts: [], additionalServices: [] }).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set(auth).expect(200);

    const billing = await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set(auth).expect(200);
    const { billingEstimate } = billing.body.data;
    expect(billingEstimate.technicianEarnings).toBe(Math.round(billingEstimate.serviceCharge * 0.3));
  });
});

describe('POST /tech/earnings/visit-fee/:jobId', () => {
  it('credits the configured visit fee once and is idempotent on a repeat call', async () => {
    await PlatformSettings.create({ visitFeeAmount: 200 });
    const { jobId, technician, techToken } = await createAcceptedD2CJob();

    const first = await request(app)
      .post(`/api/v1/tech/earnings/visit-fee/${jobId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({})
      .expect(200);
    expect(first.body.data).toMatchObject({ credited: true, amount: 200 });

    const second = await request(app)
      .post(`/api/v1/tech/earnings/visit-fee/${jobId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({})
      .expect(200);
    expect(second.body.data).toMatchObject({ credited: false, amount: 200, alreadyCredited: true });

    // The money moved exactly once, not twice.
    expect(await Payout.countDocuments({ job: jobId, payoutType: 'Visit' })).toBe(1);
    const tally = await EarningsTally.findOne({ technician: technician._id });
    expect(tally.total).toBe(200);
  });

  it('credits nothing when the admin has set the visit fee to zero', async () => {
    await PlatformSettings.create({ visitFeeAmount: 0 });
    const { jobId, techToken } = await createAcceptedD2CJob();

    const res = await request(app)
      .post(`/api/v1/tech/earnings/visit-fee/${jobId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({})
      .expect(200);
    expect(res.body.data).toMatchObject({ credited: false, amount: 0 });
    expect(await Payout.countDocuments({ payoutType: 'Visit' })).toBe(0);
  });

  it('rejects a completed job — those earnings are billed through the invoice', async () => {
    const { jobId, techToken } = await createAcceptedD2CJob();
    await Job.findByIdAndUpdate(jobId, { activeStep: 'completed' });

    const res = await request(app)
      .post(`/api/v1/tech/earnings/visit-fee/${jobId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({})
      .expect(409);
    expect(res.body.error.message).toMatch(/invoice/i);
  });

  it("rejects another technician's job", async () => {
    const { jobId } = await createAcceptedD2CJob();
    const { token: otherToken } = await seedTechnician();

    await request(app)
      .post(`/api/v1/tech/earnings/visit-fee/${jobId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({})
      .expect(403);
  });
});

describe('POST /tech/assistant', () => {
  it('requires a technician', async () => {
    const { token: custToken } = await seedCustomer();
    await request(app)
      .post('/api/v1/tech/assistant')
      .set('Authorization', `Bearer ${custToken}`)
      .send({ messages: [{ role: 'user', content: 'hello' }] })
      .expect(403);

    await request(app)
      .post('/api/v1/tech/assistant')
      .send({ messages: [{ role: 'user', content: 'hello' }] })
      .expect(401);
  });

  it('validates the message list', async () => {
    const { token } = await seedTechnician();
    await request(app)
      .post('/api/v1/tech/assistant')
      .set('Authorization', `Bearer ${token}`)
      .send({ messages: [] })
      .expect(400);
  });

  // Without ANTHROPIC_API_KEY the endpoint must refuse rather than fabricate an
  // answer a technician could act on. The test env sets no key.
  it('returns 503 when the assistant is not configured', async () => {
    const { token } = await seedTechnician();
    const res = await request(app)
      .post('/api/v1/tech/assistant')
      .set('Authorization', `Bearer ${token}`)
      .send({ messages: [{ role: 'user', content: 'What stock do I have?' }] })
      .expect(503);
    expect(res.body.error.message).toMatch(/not configured/i);
  });
});
