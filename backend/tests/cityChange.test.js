import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { CityChangeRequest } from '../src/modules/service-provider/cityChangeRequest.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { ASM } from '../src/modules/super-admin/asm.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('cityChange');

let app;
let counter = 0;

async function loginAndVerify({ role, identifier, password = 'password123' }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

async function seedSuperAdmin() {
  const email = `city-admin-${counter++}@test.local`;
  await User.create({ role: ROLES.SUPER_ADMIN, name: 'Super Admin', email, passwordHash: await hashPassword('password123'), status: 'Active' });
  return loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: email });
}

async function seedAsm(adminToken, cityId) {
  const email = `city-asm-${counter++}@test.local`;
  const res = await request(app)
    .post('/api/v1/super-admin/asms')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `ASM ${counter}`, email, city: cityId, password: 'password123', permissions: ['techs:view', 'techs:manage'] })
    .expect(201);
  expect(res.body.data.id).toBeTruthy();
  return loginAndVerify({ role: ROLES.ASM, identifier: email });
}

async function seedProvider(city) {
  const phone = `97${String(counter++).padStart(8, '0')}`;
  const user = await User.create({ role: ROLES.SERVICE_PROVIDER, name: 'Mover Provider', phone, passwordHash: await hashPassword('password123'), status: 'Active' });
  const provider = await ServiceProvider.create({
    user: user._id,
    name: 'Mover Provider',
    phone,
    status: 'Active',
    availability: 'Offline',
    city: city._id,
    serviceCityName: city.name,
    serviceStateName: city.state,
  });
  const token = await loginAndVerify({ role: ROLES.SERVICE_PROVIDER, identifier: phone });
  return { user, provider, token };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

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

let pune;
let mumbai;
let delhi;

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    Permission.deleteMany({}),
    ServiceProvider.deleteMany({}),
    CityChangeRequest.deleteMany({}),
    City.deleteMany({}),
    ASM.deleteMany({}),
    AuditLog.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  await Permission.create([
    { key: 'techs:view', description: 'View service providers', domain: 'techs' },
    { key: 'techs:manage', description: 'Manage service providers', domain: 'techs' },
  ]);
  [pune, mumbai, delhi] = await Promise.all([
    City.create({ name: 'Pune', state: 'Maharashtra' }),
    City.create({ name: 'Mumbai', state: 'Maharashtra' }),
    City.create({ name: 'Delhi', state: 'Delhi' }),
  ]);
});

describe('service provider requests a city change', () => {
  it('creates one pending request and refuses duplicates, the current city and inactive cities', async () => {
    const { provider, token } = await seedProvider(pune);

    const created = await request(app)
      .post('/api/v1/service-provider/profile/city-change-requests')
      .set(auth(token))
      .send({ cityId: mumbai.id, reason: 'Moved house' })
      .expect(201);
    expect(created.body.data).toMatchObject({ status: 'Pending', source: 'provider', reason: 'Moved house' });
    expect(created.body.data.fromCity.name).toBe('Pune');
    expect(created.body.data.toCity.name).toBe('Mumbai');

    await request(app).post('/api/v1/service-provider/profile/city-change-requests').set(auth(token)).send({ cityId: delhi.id }).expect(409);

    await CityChangeRequest.deleteMany({});
    await request(app).post('/api/v1/service-provider/profile/city-change-requests').set(auth(token)).send({ cityId: pune.id }).expect(400);

    await City.updateOne({ _id: delhi._id }, { status: 'Inactive' });
    await request(app).post('/api/v1/service-provider/profile/city-change-requests').set(auth(token)).send({ cityId: delhi.id }).expect(400);

    // The provider's city itself doesn't move until someone approves.
    expect(String((await ServiceProvider.findById(provider._id)).city)).toBe(pune.id);
  });

  it('lets the provider list and cancel their own pending request', async () => {
    const { token } = await seedProvider(pune);
    const { body } = await request(app)
      .post('/api/v1/service-provider/profile/city-change-requests')
      .set(auth(token))
      .send({ cityId: mumbai.id })
      .expect(201);

    const list = await request(app).get('/api/v1/service-provider/profile/city-change-requests').set(auth(token)).expect(200);
    expect(list.body.data).toHaveLength(1);

    const cancelled = await request(app)
      .post(`/api/v1/service-provider/profile/city-change-requests/${body.data.id}/cancel`)
      .set(auth(token))
      .expect(200);
    expect(cancelled.body.data.status).toBe('Cancelled');
    await request(app).post(`/api/v1/service-provider/profile/city-change-requests/${body.data.id}/cancel`).set(auth(token)).expect(409);
  });
});

describe('admin / ASM review', () => {
  async function pendingRequest() {
    const seeded = await seedProvider(pune);
    const { body } = await request(app)
      .post('/api/v1/service-provider/profile/city-change-requests')
      .set(auth(seeded.token))
      .send({ cityId: mumbai.id, reason: 'Closer to family' })
      .expect(201);
    return { ...seeded, requestId: body.data.id };
  }

  it('the ASM of the destination city approves, moving the provider and notifying them', async () => {
    const adminToken = await seedSuperAdmin();
    const mumbaiAsm = await seedAsm(adminToken, mumbai.id);
    const { provider, user, requestId } = await pendingRequest();

    const queue = await request(app).get('/api/v1/super-admin/city-change-requests?status=Pending').set(auth(mumbaiAsm)).expect(200);
    expect(queue.body.data.map((r) => r.id)).toContain(requestId);

    const approved = await request(app)
      .post(`/api/v1/super-admin/city-change-requests/${requestId}/approve`)
      .set(auth(mumbaiAsm))
      .send({ note: 'Welcome to Mumbai' })
      .expect(200);
    expect(approved.body.data.status).toBe('Approved');

    const moved = await ServiceProvider.findById(provider._id);
    expect(String(moved.city)).toBe(mumbai.id);
    expect(moved.serviceCityName).toBe('Mumbai');
    expect(await Notification.countDocuments({ recipient: user._id, title: 'Service city change approved' })).toBe(1);
    expect(await AuditLog.countDocuments({ action: /Approved service provider "Mover Provider" moving from Pune to Mumbai/ })).toBe(1);

    // Already decided — can't be decided twice.
    await request(app).post(`/api/v1/super-admin/city-change-requests/${requestId}/reject`).set(auth(mumbaiAsm)).send({}).expect(409);
  });

  it('the ASM of the current city sees it too; an unrelated ASM gets neither the request nor the decision', async () => {
    const adminToken = await seedSuperAdmin();
    const puneAsm = await seedAsm(adminToken, pune.id);
    const delhiAsm = await seedAsm(adminToken, delhi.id);
    const { requestId } = await pendingRequest();

    const puneQueue = await request(app).get('/api/v1/super-admin/city-change-requests').set(auth(puneAsm)).expect(200);
    expect(puneQueue.body.data.map((r) => r.id)).toContain(requestId);

    const delhiQueue = await request(app).get('/api/v1/super-admin/city-change-requests').set(auth(delhiAsm)).expect(200);
    expect(delhiQueue.body.data).toEqual([]);
    await request(app).post(`/api/v1/super-admin/city-change-requests/${requestId}/approve`).set(auth(delhiAsm)).send({}).expect(404);
  });

  it('a super-admin rejects with a reason; the provider keeps their city and is told why', async () => {
    const adminToken = await seedSuperAdmin();
    const { provider, user, requestId } = await pendingRequest();

    const rejected = await request(app)
      .post(`/api/v1/super-admin/city-change-requests/${requestId}/reject`)
      .set(auth(adminToken))
      .send({ note: 'Mumbai is fully staffed' })
      .expect(200);
    expect(rejected.body.data).toMatchObject({ status: 'Rejected', reviewNote: 'Mumbai is fully staffed' });

    expect(String((await ServiceProvider.findById(provider._id)).city)).toBe(pune.id);
    const note = await Notification.findOne({ recipient: user._id });
    expect(note.message).toMatch(/Mumbai was not approved\. Reason: Mumbai is fully staffed/);
  });

  it('refuses approval if the requested city was deactivated in the meantime', async () => {
    const adminToken = await seedSuperAdmin();
    const { provider, requestId } = await pendingRequest();
    await City.updateOne({ _id: mumbai._id }, { status: 'Inactive' });

    await request(app).post(`/api/v1/super-admin/city-change-requests/${requestId}/approve`).set(auth(adminToken)).send({}).expect(400);
    expect(String((await ServiceProvider.findById(provider._id)).city)).toBe(pune.id);
    expect((await CityChangeRequest.findById(requestId)).status).toBe('Pending');
  });
});

describe('super-admin changes the city directly', () => {
  it('moves the provider, closes any pending request as superseded, and records the change', async () => {
    const adminToken = await seedSuperAdmin();
    const { provider, user, token } = await seedProvider(pune);
    const { body: pending } = await request(app)
      .post('/api/v1/service-provider/profile/city-change-requests')
      .set(auth(token))
      .send({ cityId: mumbai.id })
      .expect(201);

    const res = await request(app)
      .patch(`/api/v1/super-admin/service-providers/${provider.id}/city`)
      .set(auth(adminToken))
      .send({ cityId: delhi.id, reason: 'Needed in Delhi' })
      .expect(200);
    expect(res.body.data.serviceProvider.city.name).toBe('Delhi');
    expect(res.body.data.change).toMatchObject({ source: 'admin', status: 'Approved' });

    const superseded = await CityChangeRequest.findById(pending.data.id);
    expect(superseded.status).toBe('Cancelled');
    expect(superseded.reviewNote).toMatch(/Superseded/);
    expect(await Notification.countDocuments({ recipient: user._id, title: 'Your service city was changed' })).toBe(1);

    // No-op change is refused.
    await request(app).patch(`/api/v1/super-admin/service-providers/${provider.id}/city`).set(auth(adminToken)).send({ cityId: delhi.id }).expect(400);
  });

  it('is super-admin only — an ASM must use the request queue', async () => {
    const adminToken = await seedSuperAdmin();
    const puneAsm = await seedAsm(adminToken, pune.id);
    const { provider } = await seedProvider(pune);
    await request(app).patch(`/api/v1/super-admin/service-providers/${provider.id}/city`).set(auth(puneAsm)).send({ cityId: mumbai.id }).expect(403);
  });
});
