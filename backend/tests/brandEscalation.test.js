import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { createServiceRequest } from '../src/modules/service-requests/serviceRequest.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('brandEscalations');

let app;
let phoneCounter = 9600000000;
function nextPhone() {
  return String(phoneCounter++);
}
let emailCounter = 0;
function nextEmail() {
  return `brand-esc-admin-${emailCounter++}@test.local`;
}


async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

async function seedBrandWithAdmin(brandName) {
  const brand = await Brand.create({ name: brandName, category: 'Appliances', status: 'Active' });
  const role = await Role.create({ name: 'Brand Admin', scope: 'brand', brand: brand._id, permissions: [] });
  const email = nextEmail();
  const password = 'password123';
  await User.create({
    role: ROLES.BRAND_ADMIN,
    name: `${brandName} Admin`,
    email,
    brand: brand._id,
    assignedRoles: [role._id],
    passwordHash: await hashPassword(password),
    status: 'Active',
  });
  const token = await loginAndVerify({ role: ROLES.BRAND_ADMIN, identifier: email, password });
  return { brand, role, token };
}

async function seedCustomer() {
  const phone = nextPhone();
  return User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('password123') });
}

async function seedServiceRequestForBrand(brand, customer) {
  let sr = await createServiceRequest({
    user: customer._id,
    brand: brand._id,
    category: 'AC',
    description: 'Brand-warranty fixture',
    requestMode: 'B2C',
  });
  return sr;
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
    Role.deleteMany({}),
    Brand.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Escalation.deleteMany({}),
  ]);
});

describe('brand-scoped escalations API', () => {
  it('allows brand admin to create, list, and update their brand-scoped escalations, and prevents other brands from seeing/modifying them', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const brandB = await seedBrandWithAdmin('Brand B');
    const customer = await seedCustomer();

    const srA = await seedServiceRequestForBrand(brandA.brand, customer);
    const _srB = await seedServiceRequestForBrand(brandB.brand, customer);

    // 1. Create escalation for Brand A
    const createRes = await request(app)
      .post('/api/v1/brand/escalations')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({
        serviceRequest: srA.id,
        reason: 'Repeated technician delay',
        description: 'Needs immediate senior supervisor attention',
        priority: 'P1',
        raisedBy: 'Customer',
      })
      .expect(201);

    const escalationAId = createRes.body.data.id;
    expect(createRes.body.data.scope).toBe('brand');
    expect(createRes.body.data.brand).toBe(brandA.brand.id);

    // 2. Listing escalations
    // Brand A Admin should see 1 escalation
    const listResA = await request(app)
      .get('/api/v1/brand/escalations')
      .set('Authorization', `Bearer ${brandA.token}`)
      .expect(200);
    expect(listResA.body.data).toHaveLength(1);
    expect(listResA.body.data[0].reason).toBe('Repeated technician delay');
    expect(listResA.body.data[0].serviceRequest.id).toBe(srA.id);

    // Brand B Admin should see 0 escalations
    const listResB = await request(app)
      .get('/api/v1/brand/escalations')
      .set('Authorization', `Bearer ${brandB.token}`)
      .expect(200);
    expect(listResB.body.data).toHaveLength(0);

    // 3. Modifying escalation status
    // Brand B admin trying to modify Brand A's escalation should get a 404 (or 403)
    await request(app)
      .patch(`/api/v1/brand/escalations/${escalationAId}/status`)
      .set('Authorization', `Bearer ${brandB.token}`)
      .send({ status: 'Resolved' })
      .expect(404);

    // Brand A admin should succeed in modifying its own escalation
    const patchRes = await request(app)
      .patch(`/api/v1/brand/escalations/${escalationAId}/status`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ status: 'Assigned to Senior' })
      .expect(200);

    expect(patchRes.body.data.status).toBe('Assigned to Senior');

    // Verify it updated in database list
    const listResA2 = await request(app)
      .get('/api/v1/brand/escalations')
      .set('Authorization', `Bearer ${brandA.token}`)
      .expect(200);
    expect(listResA2.body.data[0].status).toBe('Assigned to Senior');
  });
});
