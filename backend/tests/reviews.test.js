import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Review } from '../src/modules/reviews/review.model.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('reviews');

let app;
let phoneCounter = 9990000000;
function nextPhone() {
  return String(phoneCounter++);
}
function tokenFor(user) {
  return signAccessToken({ sub: user.id, role: user.role, brand: user.brand ? user.brand.toString() : null, permissions: [] });
}

async function createCustomer() {
  const user = await User.create({ role: ROLES.CUSTOMER, phone: nextPhone(), name: 'Customer', passwordHash: await hashPassword('x') });
  return { user, token: tokenFor(user) };
}
async function createTechnician() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.TECHNICIAN, phone, name: 'Tech', passwordHash: await hashPassword('x') });
  const technician = await Technician.create({ user: user._id, name: 'Tech', phone, status: 'Active', availability: 'Available', specs: ['AC'] });
  return { user, technician, token: tokenFor(user) };
}
async function createBrandAdmin(brand) {
  const user = await User.create({ role: ROLES.BRAND_ADMIN, email: `ba-${nextPhone()}@test.local`, name: 'BA', brand: brand._id, passwordHash: await hashPassword('x') });
  return { user, token: tokenFor(user) };
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
  await Promise.all([User.deleteMany({}), Technician.deleteMany({}), Brand.deleteMany({}), ServiceRequest.deleteMany({}), Review.deleteMany({})]);
});

describe('POST /reviews', () => {
  it('creates a review, snapshotting the technician from the ServiceRequest', async () => {
    const customer = await createCustomer();
    const tech = await createTechnician();
    const sr = await ServiceRequest.create({ user: customer.user._id, technician: tech.technician._id, category: 'AC', status: 'Closed', timeline: [] });

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ serviceRequest: sr.id, rating: 5, comment: 'Great service', tags: ['On time'] })
      .expect(201);
    expect(res.body.data.technician).toBe(tech.technician.id);
    expect(res.body.data.status).toBe('Reviewed');
  });

  it('rejects reviewing a service request that is not the caller\'s own', async () => {
    const owner = await createCustomer();
    const intruder = await createCustomer();
    const tech = await createTechnician();
    const sr = await ServiceRequest.create({ user: owner.user._id, technician: tech.technician._id, category: 'AC', status: 'Closed', timeline: [] });

    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({ serviceRequest: sr.id, rating: 3 })
      .expect(403);
  });

  it('rejects a second review for the same service request', async () => {
    const customer = await createCustomer();
    const tech = await createTechnician();
    const sr = await ServiceRequest.create({ user: customer.user._id, technician: tech.technician._id, category: 'AC', status: 'Closed', timeline: [] });

    await request(app).post('/api/v1/reviews').set('Authorization', `Bearer ${customer.token}`).send({ serviceRequest: sr.id, rating: 5 }).expect(201);
    await request(app).post('/api/v1/reviews').set('Authorization', `Bearer ${customer.token}`).send({ serviceRequest: sr.id, rating: 2 }).expect(409);
  });
});

describe('GET /reviews/technicians/:technicianId', () => {
  it('lists a technician\'s reviews, publicly (no auth)', async () => {
    const customer = await createCustomer();
    const tech = await createTechnician();
    const sr = await ServiceRequest.create({ user: customer.user._id, technician: tech.technician._id, category: 'AC', status: 'Closed', timeline: [] });
    await Review.create({ serviceRequest: sr._id, user: customer.user._id, technician: tech.technician._id, rating: 4 });

    const res = await request(app).get(`/api/v1/reviews/technicians/${tech.technician.id}`).expect(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('PATCH /reviews/:id/respond', () => {
  it('lets the owning brand respond, and rejects a different brand', async () => {
    const brandA = await Brand.create({ name: 'Brand A' });
    const brandB = await Brand.create({ name: 'Brand B' });
    const baA = await createBrandAdmin(brandA);
    const baB = await createBrandAdmin(brandB);

    const customer = await createCustomer();
    const tech = await createTechnician();
    const sr = await ServiceRequest.create({ user: customer.user._id, technician: tech.technician._id, brand: brandA._id, category: 'AC', status: 'Closed', timeline: [] });
    const review = await Review.create({ serviceRequest: sr._id, user: customer.user._id, technician: tech.technician._id, rating: 3 });

    await request(app).patch(`/api/v1/reviews/${review.id}/respond`).set('Authorization', `Bearer ${baB.token}`).send({ response: 'x' }).expect(403);

    const res = await request(app)
      .patch(`/api/v1/reviews/${review.id}/respond`)
      .set('Authorization', `Bearer ${baA.token}`)
      .send({ response: 'Thanks for the feedback!' })
      .expect(200);
    expect(res.body.data.status).toBe('Responded');
    expect(res.body.data.brandResponse).toBe('Thanks for the feedback!');
  });
});
