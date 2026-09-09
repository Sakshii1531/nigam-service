/**
 * adminTechnician.test.js
 *
 * Covers the two routes the super-admin console was calling before they existed:
 *   1. /api/v1/super-admin/technicians — the platform-wide technician directory
 *   2. /api/v1/notifications/push|sms  — ad-hoc dispatch from the console
 *
 * Both were 404s reached from Assignment.jsx and Technicians.jsx.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Job } from '../src/modules/technician/job.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('adminTechnician');

let app;
let emailCounter = 0;


async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

async function seedSuperAdmin() {
  const email = `admin-tech-${emailCounter++}@test.local`;
  const password = 'password123';
  await User.create({
    role: ROLES.SUPER_ADMIN,
    name: 'Super Admin',
    email,
    passwordHash: await hashPassword(password),
    status: 'Active',
  });
  return loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: email, password });
}

let phoneCounter = 0;
async function seedTechnician(overrides = {}) {
  const phone = `98000${String(phoneCounter++).padStart(5, '0')}`;
  const user = await User.create({
    role: ROLES.TECHNICIAN,
    name: overrides.name || 'Tech User',
    phone,
    passwordHash: 'stub',
    status: 'Active',
    fcmTokens: overrides.fcmTokens || [],
  });
  const technician = await Technician.create({
    user: user._id,
    name: overrides.name || 'Tech User',
    phone,
    specs: overrides.specs || ['AC'],
    status: overrides.status || 'Pending',
    availability: overrides.availability || 'Offline',
    ...(overrides.city ? { city: overrides.city } : {}),
  });
  return { user, technician };
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
    Job.deleteMany({}),
    Notification.deleteMany({}),
    City.deleteMany({}),
    ServiceRequest.deleteMany({}),
  ]);
});

describe('GET /super-admin/technicians', () => {
  it('rejects unauthenticated and non-super-admin callers', async () => {
    await request(app).get('/api/v1/super-admin/technicians').expect(401);

    await User.create({
      role: ROLES.CUSTOMER,
      phone: '9700000001',
      name: 'Cust',
      passwordHash: await hashPassword('password123'),
    });
    const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: '9700000001', password: 'password123' });
    await request(app)
      .get('/api/v1/super-admin/technicians')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('lists every technician on the platform, not just the caller', async () => {
    const token = await seedSuperAdmin();
    await seedTechnician({ name: 'Rahul' });
    await seedTechnician({ name: 'Amit' });

    const res = await request(app)
      .get('/api/v1/super-admin/technicians')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    // The console addresses pushes to the underlying User, so `user` must survive serialisation.
    expect(res.body.data[0].user).toBeDefined();
  });

  it('filters by status — Assignment.jsx only offers Active technicians', async () => {
    const token = await seedSuperAdmin();
    await seedTechnician({ name: 'Active One', status: 'Active' });
    await seedTechnician({ name: 'Pending One', status: 'Pending' });

    const res = await request(app)
      .get('/api/v1/super-admin/technicians?status=Active')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Active One');
  });

  it('searches by name and treats regex metacharacters literally', async () => {
    const token = await seedSuperAdmin();
    await seedTechnician({ name: 'Suresh Raina' });
    await seedTechnician({ name: 'Vikram Batra' });

    const hit = await request(app)
      .get('/api/v1/super-admin/technicians?search=Raina')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(hit.body.data).toHaveLength(1);

    // Would throw "Invalid regular expression" if the term were not escaped.
    const literal = await request(app)
      .get('/api/v1/super-admin/technicians?search=a%2B%2B')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(literal.body.data).toHaveLength(0);
  });

  it('rejects an unknown status value', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .get('/api/v1/super-admin/technicians?status=Bogus')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});

describe('PATCH /super-admin/technicians/:id/status', () => {
  it('persists the new status and forces a non-Active technician offline', async () => {
    const token = await seedSuperAdmin();
    const { technician } = await seedTechnician({ status: 'Active', availability: 'Available' });

    const res = await request(app)
      .patch(`/api/v1/super-admin/technicians/${technician._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Inactive' })
      .expect(200);

    expect(res.body.data.status).toBe('Inactive');
    expect(res.body.data.availability).toBe('Offline');

    const inDb = await Technician.findById(technician._id);
    expect(inDb.status).toBe('Inactive');
  });

  it('404s for an unknown technician', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .patch(`/api/v1/super-admin/technicians/${new mongoose.Types.ObjectId()}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Active' })
      .expect(404);
  });
});

describe('DELETE /super-admin/technicians/:id', () => {
  it('deletes a technician with no active jobs', async () => {
    const token = await seedSuperAdmin();
    const { technician } = await seedTechnician();

    await request(app)
      .delete(`/api/v1/super-admin/technicians/${technician._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(await Technician.findById(technician._id)).toBeNull();
  });

  it('refuses to delete a technician who is mid-job', async () => {
    const token = await seedSuperAdmin();
    const { user, technician } = await seedTechnician({ status: 'Active' });

    const serviceRequest = await ServiceRequest.create({
      user: user._id,
      status: 'Assigned',
    });
    await Job.create({
      serviceRequest: serviceRequest._id,
      technician: technician._id,
      type: 'NCC Paid Service',
      activeStep: 'inspection',
    });

    const res = await request(app)
      .delete(`/api/v1/super-admin/technicians/${technician._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    expect(res.body.error.message).toMatch(/active job/i);
    expect(await Technician.findById(technician._id)).not.toBeNull();
  });
});

describe('POST /notifications/push — ad-hoc admin dispatch', () => {
  it('writes an in-app notification addressed to the recipient', async () => {
    const token = await seedSuperAdmin();
    const { user } = await seedTechnician();

    const res = await request(app)
      .post('/api/v1/notifications/push')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: String(user._id), title: 'Account Approved!', body: 'You are live.' })
      .expect(201);

    expect(res.body.data.title).toBe('Account Approved!');

    const inDb = await Notification.findOne({ recipient: user._id });
    expect(inDb).not.toBeNull();
    expect(inDb.message).toBe('You are live.');
  });

  it('supports a role-wide broadcast with no single recipient', async () => {
    const token = await seedSuperAdmin();

    await request(app)
      .post('/api/v1/notifications/push')
      .set('Authorization', `Bearer ${token}`)
      .send({ broadcastRole: 'Technicians', title: 'Maintenance', body: 'App update tonight.' })
      .expect(201);

    const inDb = await Notification.findOne({ broadcastRole: 'Technicians' });
    expect(inDb).not.toBeNull();
    expect(inDb.recipient).toBeNull();
  });

  it('rejects a payload with neither recipientId nor broadcastRole', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .post('/api/v1/notifications/push')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Nowhere', body: 'To nobody.' })
      .expect(400);
  });

  it('rejects a payload carrying both', async () => {
    const token = await seedSuperAdmin();
    const { user } = await seedTechnician();
    await request(app)
      .post('/api/v1/notifications/push')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: String(user._id), broadcastRole: 'All', title: 'T', body: 'B' })
      .expect(400);
  });

  it('404s for an unknown recipient rather than writing a dangling notification', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .post('/api/v1/notifications/push')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: String(new mongoose.Types.ObjectId()), title: 'T', body: 'B' })
      .expect(404);

    expect(await Notification.countDocuments()).toBe(0);
  });

  it('is closed to non-super-admins', async () => {
    await User.create({
      role: ROLES.CUSTOMER,
      phone: '9700000002',
      name: 'Cust',
      passwordHash: await hashPassword('password123'),
    });
    const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: '9700000002', password: 'password123' });
    await request(app)
      .post('/api/v1/notifications/push')
      .set('Authorization', `Bearer ${token}`)
      .send({ broadcastRole: 'All', title: 'T', body: 'B' })
      .expect(403);
  });
});

describe('POST /notifications/sms — ad-hoc admin dispatch', () => {
  it('accepts an explicit phone number', async () => {
    const token = await seedSuperAdmin();
    const res = await request(app)
      .post('/api/v1/notifications/sms')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'smsindiahub', phone: '9876543210', message: 'Approved.' })
      .expect(200);

    expect(res.body.data).toEqual({ sent: true, to: '9876543210' });
  });

  it('resolves the number from a recipientId when no phone is given', async () => {
    const token = await seedSuperAdmin();
    const { user } = await seedTechnician();

    const res = await request(app)
      .post('/api/v1/notifications/sms')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: String(user._id), message: 'Approved.' })
      .expect(200);

    expect(res.body.data.to).toBe(user.phone);
  });

  it('400s when given neither phone nor recipientId', async () => {
    const token = await seedSuperAdmin();
    await request(app)
      .post('/api/v1/notifications/sms')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Nowhere.' })
      .expect(400);
  });
});

describe('public technician application (/tech/register)', () => {
  it('creates a Pending, Offline technician the console then sees', async () => {
    const token = await seedSuperAdmin();
    const city = await City.create({ name: 'Lucknow' });

    const res = await request(app)
      .post('/api/v1/tech/register')
      .field('name', 'Applicant One')
      .field('phone', '9811100011')
      .field('email', 'applicant1@test.com')
      .field('password', 'password123')
      .field('city', 'Lucknow')
      .field('specs', JSON.stringify(['AC', 'Refrigerator']))
      .expect(201);

    expect(res.body.data.status).toBe('Pending');

    const technician = await Technician.findById(res.body.data.id);
    // Must not be assignable until a human approves it.
    expect(technician.status).toBe('Pending');
    expect(technician.availability).toBe('Offline');
    expect(technician.specs).toEqual(['AC', 'Refrigerator']);
    expect(String(technician.city)).toBe(String(city._id));

    const listed = await request(app)
      .get('/api/v1/super-admin/technicians?status=Pending')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listed.body.data.some((t) => t.id === res.body.data.id)).toBe(true);
  });

  it('rejects a second application for the same phone with 409', async () => {
    await request(app)
      .post('/api/v1/tech/register')
      .field('name', 'Applicant Two')
      .field('phone', '9811100022')
      .field('password', 'password123')
      .expect(201);

    const dup = await request(app)
      .post('/api/v1/tech/register')
      .field('name', 'Impostor')
      .field('phone', '9811100022')
      .field('password', 'password123')
      .expect(409);
    expect(dup.body.error.message).toMatch(/already exists/);
  });

  it('400s a short password and a missing name, and needs no auth to apply', async () => {
    await request(app)
      .post('/api/v1/tech/register')
      .field('name', 'Applicant Three')
      .field('phone', '9811100033')
      .field('password', 'short')
      .expect(400);

    await request(app)
      .post('/api/v1/tech/register')
      .field('phone', '9811100044')
      .field('password', 'password123')
      .expect(400);
  });

  it('accepts an unknown city rather than failing the application', async () => {
    const res = await request(app)
      .post('/api/v1/tech/register')
      .field('name', 'Applicant Four')
      .field('phone', '9811100055')
      .field('password', 'password123')
      .field('city', 'Nowhere-Ville')
      .expect(201);

    expect((await Technician.findById(res.body.data.id)).city).toBeNull();
  });
});
