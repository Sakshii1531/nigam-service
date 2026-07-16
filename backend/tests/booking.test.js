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
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('booking');

let app;

function captureConsoleLog() {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  return {
    code: () => {
      console.log = original;
      const match = lines.join('\n').match(/code for [^:]+: (\d{6})/);
      if (!match) throw new Error(`No OTP code found: ${lines.join('\n')}`);
      return match[1];
    },
  };
}

async function loginAndVerify({ role, identifier, password }) {
  const capture = captureConsoleLog();
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = capture.code();
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

async function seedCatalog() {
  const category = await Category.create({ key: 'AC', name: 'AC', color: '#0D47A1' });
  await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
  await ServiceCatalogItem.create({ category: category._id, slug: 'repair', name: 'Repair', price: 299 });
  await ServiceCatalogItem.create({ category: category._id, slug: 'installation', name: 'Installation', price: 499 });
  return category;
}

async function seedCustomer(phone = '9200000001') {
  await User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('password123') });
  return loginAndVerify({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
}

async function seedTechnician({ phone = '9300000001', specs = ['AC'], availability = 'Available' } = {}) {
  const user = await User.create({
    role: ROLES.TECHNICIAN,
    phone,
    name: 'Test Technician',
    passwordHash: await hashPassword('password123'),
  });
  const technician = await Technician.create({ user: user._id, name: 'Test Technician', phone, status: 'Active', availability, specs });
  const token = await loginAndVerify({ role: ROLES.TECHNICIAN, identifier: phone, password: 'password123' });
  return { technician, token };
}

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp();
});

afterAll(async () => {
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
  ]);
});

describe('POST /bookings — full booking -> service-request -> auto-assign flow', () => {
  it('creates a booking with a server-priced total, an auto-assigned technician, and a linked ServiceRequest at status Assigned', async () => {
    await seedCatalog();
    const { technician } = await seedTechnician();
    const token = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', serviceSlug: 'repair', quantity: 2 })
      .expect(201);

    const { booking, serviceRequest, technician: assigned } = res.body.data;
    expect(booking.totalPrice).toBe(598); // 299 * 2, computed server-side from the catalog, not client-supplied
    expect(booking.humanId).toMatch(/^NCC-\d{6}-\d{4}$/);
    expect(booking.technician).toBe(technician.id);
    expect(assigned.name).toBe('Test Technician');

    expect(serviceRequest.status).toBe('Assigned');
    expect(serviceRequest.timeline.map((t) => t.stepLabel)).toEqual(['New', 'Assigned']);
    expect(serviceRequest.humanId).toMatch(/^SR-\d{4}$/);
    expect(serviceRequest.booking).toBe(booking.id);
  });

  it('ignores a client-supplied price — total is always derived from the catalog', async () => {
    await seedCatalog();
    await seedTechnician();
    const token = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', serviceSlug: 'repair', totalPrice: 1, price: 1 })
      .expect(201);

    expect(res.body.data.booking.totalPrice).toBe(299);
  });

  it('creates the booking with no technician assigned (and ServiceRequest stays "New") when none are available', async () => {
    await seedCatalog();
    // no technician seeded at all
    const token = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', serviceSlug: 'repair' })
      .expect(201);

    expect(res.body.data.booking.technician).toBeNull();
    expect(res.body.data.serviceRequest.status).toBe('New');
    expect(res.body.data.technician).toBeNull();
  });

  it('404s for an unknown category/service combination', async () => {
    await seedCatalog();
    const token = await seedCustomer();
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', serviceSlug: 'not-a-real-service' })
      .expect(404);
  });

  it('rejects an unauthenticated request with 401', async () => {
    await request(app).post('/api/v1/bookings').send({ category: 'AC', serviceSlug: 'repair' }).expect(401);
  });

  it('rejects a non-customer role (e.g. technician) with 403', async () => {
    await seedCatalog();
    const { token } = await seedTechnician();
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', serviceSlug: 'repair' })
      .expect(403);
  });
});

describe('GET /bookings, GET /bookings/:id — ownership', () => {
  it('lists only the requesting customer\'s own bookings', async () => {
    await seedCatalog();
    await seedTechnician();
    const tokenA = await seedCustomer('9200000002');
    const tokenB = await seedCustomer('9200000003');

    await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${tokenA}`).send({ category: 'AC', serviceSlug: 'repair' });

    const resA = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(resA.body.data).toHaveLength(1);

    const resB = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${tokenB}`).expect(200);
    expect(resB.body.data).toHaveLength(0);
  });

  it('rejects viewing another customer\'s booking with 403', async () => {
    await seedCatalog();
    await seedTechnician();
    const tokenA = await seedCustomer('9200000004');
    const tokenB = await seedCustomer('9200000005');

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ category: 'AC', serviceSlug: 'repair' });

    await request(app)
      .get(`/api/v1/bookings/${createRes.body.data.booking.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });
});

describe('POST /bookings/:id/cancel', () => {
  it('cancels the booking and its linked ServiceRequest', async () => {
    await seedCatalog();
    await seedTechnician();
    const token = await seedCustomer('9200000006');

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', serviceSlug: 'repair' });
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
    const { token: techToken } = await seedTechnician({ phone: '9300000002' });
    const custToken = await seedCustomer('9200000007');
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${custToken}`)
      .send({ category: 'AC', serviceSlug: 'repair' });
    return { srId: createRes.body.data.serviceRequest.id, techToken, custToken };
  }

  it('lets the assigned technician make a valid transition and records it in the timeline', async () => {
    const { srId, techToken } = await createAssignedBooking();

    const res = await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'Engineer Accepted' })
      .expect(200);

    expect(res.body.data.status).toBe('Engineer Accepted');
    expect(res.body.data.timeline.map((t) => t.stepLabel)).toEqual(['New', 'Assigned', 'Engineer Accepted']);
  });

  it('rejects an out-of-order transition (skipping steps) with 400', async () => {
    const { srId, techToken } = await createAssignedBooking();

    await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
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

  it('rejects a transition attempt from a technician who is not the one assigned', async () => {
    const { srId } = await createAssignedBooking();
    const { token: otherTechToken } = await seedTechnician({ phone: '9300000003' });

    await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${otherTechToken}`)
      .send({ status: 'Engineer Accepted' })
      .expect(403);
  });

  it('walks a request through the full happy-path lifecycle to Closed', async () => {
    const { srId, techToken } = await createAssignedBooking();
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
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status });
      expect(res.status).toBe(200);
    }

    const final = await request(app).get(`/api/v1/service-requests/${srId}`).set('Authorization', `Bearer ${techToken}`);
    expect(final.body.data.status).toBe('Closed');
    expect(final.body.data.timeline).toHaveLength(9); // New, Assigned, + the 7 steps above

    // Closed is terminal — no further transitions allowed.
    await request(app)
      .patch(`/api/v1/service-requests/${srId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'New' })
      .expect(400);
  });
});
