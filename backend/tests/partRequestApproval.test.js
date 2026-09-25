import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { PartOrder } from '../src/modules/service-provider/partOrder.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { seedSimpleOffering, offeringBooking, clearCatalogue } from './helpers/catalogue.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('partRequestApproval');

let app;
let phoneCounter = 9600000000;
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
  await seedSimpleOffering({ categoryKey: category.key, price: 1000 });
}

async function seedCustomer() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('password123') });
  const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
  return { user, token };
}

async function seedServiceProvider() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.SERVICE_PROVIDER, phone, name: 'Test Service Provider', passwordHash: await hashPassword('password123') });
  const serviceProvider = await ServiceProvider.create({ user: user._id, name: 'Test Service Provider', phone, status: 'Active', availability: 'Available', specs: ['AC'] });
  const token = await loginAndVerify({ role: ROLES.SERVICE_PROVIDER, identifier: phone, password: 'password123' });
  return { serviceProvider, token };
}

async function loginAsAdmin() {
  const email = `partorder-admin-${nextPhone()}@test.dev`;
  await User.create({ role: ROLES.SUPER_ADMIN, email, name: 'Admin', passwordHash: await hashPassword('password123') });
  await request(app).post('/api/v1/auth/login').send({ role: ROLES.SUPER_ADMIN, identifier: email, password: 'password123' });
  const code = readOtpCode(email);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role: ROLES.SUPER_ADMIN, identifier: email, code });
  return res.body.data.accessToken;
}

/** A D2C job, accepted, with a real booking+part request already raised —
 * the starting point for every test below. */
async function createJobWithPartRequested(orderSource = 'NCC Warehouse') {
  await seedCatalog();
  const { serviceProvider, token: serviceProviderToken } = await seedServiceProvider();
  const { token: custToken, user: customer } = await seedCustomer();

  const bookingRes = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${custToken}`)
    .send(await offeringBooking('TEST-REPAIR'))
    .expect(201);
  const bookingId = bookingRes.body.data.booking.id;
  const srId = bookingRes.body.data.serviceRequest.id;

  const acceptRes = await request(app)
    .post(`/api/v1/service-provider/jobs/accept/${srId}`)
    .set('Authorization', `Bearer ${serviceProviderToken}`)
    .send({})
    .expect(200);
  const jobId = acceptRes.body.data.id;

  await request(app)
    .post(`/api/v1/service-provider/jobs/${jobId}/request-part`)
    .set('Authorization', `Bearer ${serviceProviderToken}`)
    .send({ partName: 'Compressor', price: 4500, qty: 1, orderSource })
    .expect(200);

  return { jobId, srId, bookingId, serviceProvider, serviceProviderToken, custToken, customer };
}

async function approveAsCustomer(bookingId, custToken) {
  await request(app)
    .post(`/api/v1/bookings/${bookingId}/respond-part-request`)
    .set('Authorization', `Bearer ${custToken}`)
    .send({ approve: true })
    .expect(200);
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
    Booking.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Job.deleteMany({}),
    PartOrder.deleteMany({}),
  ]);
});

describe('requesting a spare part snapshots a pending approval onto the booking', () => {
  it('sets booking.partApproval and creates a PartOrder both awaiting the customer', async () => {
    const { bookingId, jobId } = await createJobWithPartRequested();

    const booking = await Booking.findById(bookingId);
    expect(booking.partApproval.status).toBe('Pending');
    expect(booking.partApproval.amount).toBe(4500);
    expect(booking.partApproval.partNames).toEqual(['Compressor']);

    const orders = await PartOrder.find({ job: jobId });
    expect(orders).toHaveLength(1);
    expect(orders[0].customerApprovalStatus).toBe('Pending');
    expect(orders[0].status).toBe('Pending');
  });
});

describe('super-admin is blocked from actioning a part request the customer has not approved', () => {
  it('rejects an approve attempt while customerApprovalStatus is Pending', async () => {
    const { jobId } = await createJobWithPartRequested();
    const order = await PartOrder.findOne({ job: jobId });
    const adminToken = await loginAsAdmin();

    const res = await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Approved' })
      .expect(400);
    expect(res.body.error.message).toMatch(/has not approved/i);
  });

  it('still allows super-admin to Reject outright without customer approval', async () => {
    const { jobId } = await createJobWithPartRequested();
    const order = await PartOrder.findOne({ job: jobId });
    const adminToken = await loginAsAdmin();

    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Rejected' })
      .expect(200);
  });
});

describe('POST /bookings/:id/respond-part-request', () => {
  it('customer approving unblocks the super-admin queue for the same request', async () => {
    const { bookingId, jobId, custToken } = await createJobWithPartRequested();

    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/respond-part-request`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ approve: true })
      .expect(200);
    expect(res.body.data.partApproval.status).toBe('Approved');

    const order = await PartOrder.findOne({ job: jobId });
    expect(order.customerApprovalStatus).toBe('Approved');

    const adminToken = await loginAsAdmin();
    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Approved' })
      .expect(200);
  });

  it('customer rejecting finalizes the PartOrder as Rejected and never reaches super-admin', async () => {
    const { bookingId, jobId, custToken } = await createJobWithPartRequested();

    await request(app)
      .post(`/api/v1/bookings/${bookingId}/respond-part-request`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ approve: false })
      .expect(200);

    const order = await PartOrder.findOne({ job: jobId });
    expect(order.customerApprovalStatus).toBe('Rejected');
    expect(order.status).toBe('Rejected');

    const booking = await Booking.findById(bookingId);
    expect(booking.partApproval.status).toBe('Rejected');
  });

  it('rejects a second response once the customer has already answered', async () => {
    const { bookingId, custToken } = await createJobWithPartRequested();
    await request(app)
      .post(`/api/v1/bookings/${bookingId}/respond-part-request`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ approve: true })
      .expect(200);

    await request(app)
      .post(`/api/v1/bookings/${bookingId}/respond-part-request`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ approve: true })
      .expect(400);
  });

  it('rejects a response from a customer who does not own the booking', async () => {
    const { bookingId } = await createJobWithPartRequested();
    const { token: otherCustToken } = await seedCustomer();

    await request(app)
      .post(`/api/v1/bookings/${bookingId}/respond-part-request`)
      .set('Authorization', `Bearer ${otherCustToken}`)
      .send({ approve: true })
      .expect(403);
  });

  it('400s when there is no pending part request on the booking at all', async () => {
    const { token: custToken } = await seedCustomer();
    await seedCatalog();
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${custToken}`)
      .send(await offeringBooking('TEST-REPAIR'))
      .expect(201);

    await request(app)
      .post(`/api/v1/bookings/${bookingRes.body.data.booking.id}/respond-part-request`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ approve: true })
      .expect(400);
  });
});

describe('two fulfilment ladders for a PartOrder', () => {
  it('an NCC Warehouse request gets fulfillmentType in_stock and walks Approved -> Ready to Hand Over -> Handed Over', async () => {
    const { bookingId, jobId, custToken } = await createJobWithPartRequested('NCC Warehouse');
    await approveAsCustomer(bookingId, custToken);
    const order = await PartOrder.findOne({ job: jobId });
    expect(order.fulfillmentType).toBe('in_stock');

    const adminToken = await loginAsAdmin();

    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Approved' })
      .expect(200);

    // The procurement-only steps are rejected for an in-stock order.
    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Dispatched' })
      .expect(400);

    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Ready to Hand Over' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Handed Over' })
      .expect(200);
    expect(res.body.data.status).toBe('Handed Over');

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe('Upcoming');
    expect(booking.instantStatus).toBe('RESCHEDULED');

    const job = await Job.findById(jobId);
    expect(job.activeStep).toBe('revisit_scheduled');
  });

  it('a Partner Brand (procurement) request gets fulfillmentType procurement and walks Approved -> Dispatched -> Delivered', async () => {
    const { bookingId, jobId, custToken } = await createJobWithPartRequested('Partner Brand');
    await approveAsCustomer(bookingId, custToken);
    const order = await PartOrder.findOne({ job: jobId });
    expect(order.fulfillmentType).toBe('procurement');

    const adminToken = await loginAsAdmin();

    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Approved' })
      .expect(200);

    // The in-stock-only steps are rejected for a procurement order.
    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Ready to Hand Over' })
      .expect(400);

    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Dispatched' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Delivered' })
      .expect(200);
    expect(res.body.data.status).toBe('Delivered');

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe('Upcoming');
    expect(booking.instantStatus).toBe('RESCHEDULED');
  });

  it('Rejected is always allowed regardless of fulfillmentType', async () => {
    const { bookingId, jobId, custToken } = await createJobWithPartRequested('NCC Warehouse');
    await approveAsCustomer(bookingId, custToken);
    const order = await PartOrder.findOne({ job: jobId });
    const adminToken = await loginAsAdmin();

    await request(app)
      .patch(`/api/v1/super-admin/part-orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Rejected' })
      .expect(200);
  });
});
