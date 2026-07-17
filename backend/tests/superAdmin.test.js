import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { ServicePartner } from '../src/modules/super-admin/servicePartner.model.js';
import { ASM } from '../src/modules/super-admin/asm.model.js';
import { AssignmentWeighting } from '../src/modules/super-admin/assignmentWeighting.model.js';
import { PlatformSettings } from '../src/modules/super-admin/platformSettings.model.js';
import { SparePartCatalog } from '../src/modules/super-admin/sparePartCatalog.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Banner } from '../src/modules/super-admin/banner.model.js';
import { CMSPage } from '../src/modules/super-admin/cmsPage.model.js';
import { AppSetting } from '../src/modules/super-admin/appSetting.model.js';
import { LoyaltyMilestone } from '../src/modules/rewards-loyalty/loyaltyMilestone.model.js';
import { Membership } from '../src/modules/rewards-loyalty/membership.model.js';
import { SpinWheelConfig } from '../src/modules/rewards-loyalty/spinWheelConfig.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ExchangeRequest } from '../src/modules/warranty-amc-exchange/exchangeRequest.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('superAdmin');

let app;
let emailCounter = 0;
function nextEmail() {
  return `super-admin-${emailCounter++}@test.local`;
}

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

async function seedSuperAdmin() {
  const email = nextEmail();
  const password = 'password123';
  await User.create({ role: ROLES.SUPER_ADMIN, name: 'Super Admin', email, passwordHash: await hashPassword(password), status: 'Active' });
  const token = await loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: email, password });
  return { email, token };
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
    Role.deleteMany({}),
    Permission.deleteMany({}),
    Brand.deleteMany({}),
    City.deleteMany({}),
    ServicePartner.deleteMany({}),
    ASM.deleteMany({}),
    AssignmentWeighting.deleteMany({}),
    PlatformSettings.deleteMany({}),
    SparePartCatalog.deleteMany({}),
    Escalation.deleteMany({}),
    AuditLog.deleteMany({}),
    Banner.deleteMany({}),
    CMSPage.deleteMany({}),
    AppSetting.deleteMany({}),
    LoyaltyMilestone.deleteMany({}),
    Membership.deleteMany({}),
    SpinWheelConfig.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Category.deleteMany({}),
    ExchangeRequest.deleteMany({}),
  ]);
});

describe('authorization — every route requires super_admin', () => {
  it('rejects unauthenticated and non-super-admin requests', async () => {
    await request(app).get('/api/v1/super-admin/brands').expect(401);

    await User.create({ role: ROLES.CUSTOMER, phone: '9700000001', name: 'X', passwordHash: await hashPassword('password123') });
    const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: '9700000001', password: 'password123' });
    await request(app).get('/api/v1/super-admin/brands').set('Authorization', `Bearer ${token}`).expect(403);
  });
});

describe('Brand', () => {
  it('creates, lists, gets, and updates a brand, rejecting a duplicate name', async () => {
    const { token } = await seedSuperAdmin();

    const createRes = await request(app)
      .post('/api/v1/super-admin/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'LG', category: 'Appliances' })
      .expect(201);

    await request(app)
      .post('/api/v1/super-admin/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'LG' })
      .expect(409);

    const listRes = await request(app).get('/api/v1/super-admin/brands').set('Authorization', `Bearer ${token}`).expect(200);
    expect(listRes.body.data).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/v1/super-admin/brands/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Active' })
      .expect(200);
    expect(updateRes.body.data.status).toBe('Active');
  });
});

describe('City, ServicePartner, ASM', () => {
  it('creates a city, a service partner in it, and an ASM overseeing that partner', async () => {
    const { token } = await seedSuperAdmin();

    const cityRes = await request(app)
      .post('/api/v1/super-admin/cities')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lucknow', state: 'UP' })
      .expect(201);

    await request(app)
      .post('/api/v1/super-admin/cities')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lucknow', state: 'UP' })
      .expect(409);

    const partnerRes = await request(app)
      .post('/api/v1/super-admin/service-partners')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'NCC Lucknow', city: cityRes.body.data.id })
      .expect(201);

    const getPartnerRes = await request(app)
      .get(`/api/v1/super-admin/service-partners/${partnerRes.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(getPartnerRes.body.data.technicianCount).toBe(0);

    const asmRes = await request(app)
      .post('/api/v1/super-admin/asms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Vikas Kumar', city: cityRes.body.data.id })
      .expect(201);

    const addPartnerRes = await request(app)
      .post(`/api/v1/super-admin/asms/${asmRes.body.data.id}/partners`)
      .set('Authorization', `Bearer ${token}`)
      .send({ partnerId: partnerRes.body.data.id })
      .expect(200);
    expect(addPartnerRes.body.data.partners).toContain(partnerRes.body.data.id);

    const removePartnerRes = await request(app)
      .delete(`/api/v1/super-admin/asms/${asmRes.body.data.id}/partners/${partnerRes.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(removePartnerRes.body.data.partners).not.toContain(partnerRes.body.data.id);
  });
});

describe('AssignmentWeighting', () => {
  it('rejects weights that do not sum to 100', async () => {
    const { token } = await seedSuperAdmin();
    await request(app)
      .put('/api/v1/super-admin/assignment-weighting')
      .set('Authorization', `Bearer ${token}`)
      .send({ proximityPercent: 50, skillPercent: 50, ratingPercent: 50, workloadPercent: 10 })
      .expect(400);
  });

  it('accepts weights summing to exactly 100', async () => {
    const { token } = await seedSuperAdmin();
    const res = await request(app)
      .put('/api/v1/super-admin/assignment-weighting')
      .set('Authorization', `Bearer ${token}`)
      .send({ proximityPercent: 25, skillPercent: 25, ratingPercent: 25, workloadPercent: 25 })
      .expect(200);
    expect(res.body.data.proximityPercent).toBe(25);
  });
});

describe('PlatformSettings', () => {
  it('gets a singleton with defaults and updates it, writing an audit log entry', async () => {
    const { token } = await seedSuperAdmin();

    const getRes = await request(app).get('/api/v1/super-admin/settings').set('Authorization', `Bearer ${token}`).expect(200);
    expect(getRes.body.data.coinConversionRate).toBe(10);
    expect(getRes.body.data.id).toBeDefined();
    expect(getRes.body.data._id).toBeUndefined();

    await request(app)
      .put('/api/v1/super-admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ supportEmail: 'support@test.local' })
      .expect(200);

    const logsRes = await request(app).get('/api/v1/super-admin/audit-logs').set('Authorization', `Bearer ${token}`).expect(200);
    expect(logsRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(logsRes.body.data[0].action).toMatch(/platform settings/);
  });
});

describe('SparePartCatalog', () => {
  it('creates a spare part with derived retailPrice and status virtuals', async () => {
    const { token } = await seedSuperAdmin();
    const res = await request(app)
      .post('/api/v1/super-admin/spare-parts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Compressor', costPrice: 1000, markupPercent: 20, stock: 3 })
      .expect(201);
    expect(res.body.data.retailPrice).toBe(1200);
    expect(res.body.data.status).toBe('Low Stock');
    expect(res.body.data.humanId).toMatch(/^SKU-/);
  });
});

describe('Escalation', () => {
  it('creates a platform-scope escalation, assigns a manager, and resolves it', async () => {
    const { token } = await seedSuperAdmin();
    const customer = await User.create({ role: ROLES.CUSTOMER, phone: '9700000002', name: 'C', passwordHash: await hashPassword('x') });
    const sr = await ServiceRequest.create({ user: customer._id, category: 'AC', status: 'New', timeline: [] });
    const manager = await User.create({ role: ROLES.SUPER_ADMIN, email: nextEmail(), name: 'Manager', passwordHash: await hashPassword('x') });

    const createRes = await request(app)
      .post('/api/v1/super-admin/escalations')
      .set('Authorization', `Bearer ${token}`)
      .send({ serviceRequest: sr.id, reason: 'SLA breach', priority: 'High' })
      .expect(201);
    expect(createRes.body.data.status).toBe('Open');

    const assignRes = await request(app)
      .patch(`/api/v1/super-admin/escalations/${createRes.body.data.id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ managerId: manager.id })
      .expect(200);
    expect(assignRes.body.data.status).toBe('In Progress');

    const resolveRes = await request(app)
      .patch(`/api/v1/super-admin/escalations/${createRes.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Resolved' })
      .expect(200);
    expect(resolveRes.body.data.status).toBe('Resolved');
  });
});

describe('CMS — public reads, admin-gated writes', () => {
  it('lets a customer (or anyone, unauthenticated) read banners, but only super_admin can write them', async () => {
    const { token } = await seedSuperAdmin();

    const createRes = await request(app)
      .post('/api/v1/cms/banners')
      .set('Authorization', `Bearer ${token}`)
      .send({ imageUrl: 'https://example.com/b.png', app: 'customer' })
      .expect(201);

    const publicRes = await request(app).get('/api/v1/cms/banners').expect(200);
    expect(publicRes.body.data).toHaveLength(1);

    await request(app).post('/api/v1/cms/banners').send({ imageUrl: 'x' }).expect(401);

    const deleteRes = await request(app)
      .delete(`/api/v1/cms/banners/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(deleteRes.body.data.deleted).toBe(true);
  });

  it('upserts a CMS page by slug, readable publicly', async () => {
    const { token } = await seedSuperAdmin();
    await request(app)
      .put('/api/v1/cms/pages/privacy-policy')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'v1' })
      .expect(200);
    await request(app)
      .put('/api/v1/cms/pages/privacy-policy')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'v2' })
      .expect(200);

    const getRes = await request(app).get('/api/v1/cms/pages/privacy-policy').expect(200);
    expect(getRes.body.data.body).toBe('v2');
    expect(getRes.body.data.id).toBeDefined();
  });

  it('sets and reads an app setting as a flat key/value map', async () => {
    const { token } = await seedSuperAdmin();
    await request(app)
      .put('/api/v1/cms/app-settings/technician')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'autoAssign', value: true })
      .expect(200);

    const getRes = await request(app).get('/api/v1/cms/app-settings/technician').expect(200);
    expect(getRes.body.data).toEqual({ autoAssign: true });
  });
});

describe('loyalty config', () => {
  it('CRUDs a milestone and a membership tier, rejecting a duplicate tierRank', async () => {
    const { token } = await seedSuperAdmin();

    const milestoneRes = await request(app)
      .post('/api/v1/super-admin/loyalty/milestones')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bronze', threshold: 500 })
      .expect(201);
    expect(milestoneRes.body.data.status).toBe('Locked');

    await request(app)
      .post('/api/v1/super-admin/loyalty/memberships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Silver', price: 499, tierRank: 1 })
      .expect(201);
    await request(app)
      .post('/api/v1/super-admin/loyalty/memberships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Silver Duplicate', price: 599, tierRank: 1 })
      .expect(409);
  });

  it('rejects spin-wheel segment probabilities summing over 100', async () => {
    const { token } = await seedSuperAdmin();
    await request(app)
      .put('/api/v1/super-admin/loyalty/spin-wheel')
      .set('Authorization', `Bearer ${token}`)
      .send({ segments: [{ label: 'a', probability: 60 }, { label: 'b', probability: 60 }] })
      .expect(400);

    const okRes = await request(app)
      .put('/api/v1/super-admin/loyalty/spin-wheel')
      .set('Authorization', `Bearer ${token}`)
      .send({ segments: [{ label: 'a', probability: 60 }, { label: 'b', probability: 40 }] })
      .expect(200);
    expect(okRes.body.data.segments).toHaveLength(2);
  });
});

describe('platform-wide RBAC', () => {
  it('creates a platform role resolving permission keys, and rejects an unknown key', async () => {
    const { token } = await seedSuperAdmin();
    await Permission.create({ key: 'users:manage', description: 'x', domain: 'users' });

    const res = await request(app)
      .post('/api/v1/super-admin/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ops', permissionKeys: ['users:manage'] })
      .expect(201);
    expect(res.body.data.scope).toBe('platform');
    expect(res.body.data.permissions).toHaveLength(1);

    await request(app)
      .post('/api/v1/super-admin/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad', permissionKeys: ['not:real'] })
      .expect(400);
  });

  it('lists/filters users across all roles without ever leaking passwordHash, and can suspend one', async () => {
    const { token } = await seedSuperAdmin();
    await User.create({ role: ROLES.TECHNICIAN, phone: '9700000003', name: 'Tech', passwordHash: await hashPassword('x') });

    const listRes = await request(app)
      .get('/api/v1/super-admin/users')
      .query({ role: ROLES.TECHNICIAN })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(JSON.stringify(listRes.body)).not.toMatch(/\$2[aby]\$/);

    const suspendRes = await request(app)
      .patch(`/api/v1/super-admin/users/${listRes.body.data[0].id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Suspended' })
      .expect(200);
    expect(suspendRes.body.data.status).toBe('Suspended');
  });
});

describe('exit criterion — CMS/catalog edits reflect immediately, no redeploy', () => {
  it('a super-admin category edit is immediately visible on the public catalog read', async () => {
    const { token } = await seedSuperAdmin();
    await Category.create({ key: 'AC', name: 'AC', color: '#000' });

    const before = await request(app).get('/api/v1/catalog/categories/AC').expect(200);
    expect(before.body.data.name).toBe('AC');

    await request(app)
      .put('/api/v1/catalog/categories/AC')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Air Conditioner' })
      .expect(200);

    const after = await request(app).get('/api/v1/catalog/categories/AC').expect(200);
    expect(after.body.data.name).toBe('Air Conditioner');
  });
});

describe('Exchange requests — physical inspection workflow (Phase 11 security fix)', () => {
  it('lists, gets, and approves a trade-in after inspection; rejects non-super-admin access', async () => {
    const { token } = await seedSuperAdmin();
    const customer = await User.create({
      role: ROLES.CUSTOMER,
      phone: '9700000099',
      name: 'Trade-in Customer',
      passwordHash: await hashPassword('password123'),
    });
    const exchangeRequest = await ExchangeRequest.create({
      user: customer._id,
      category: 'Mobile',
      baseValue: 10000,
      estimatedValue: 9000,
    });
    expect(exchangeRequest.status).toBe('Pending Inspection');

    const custToken = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: '9700000099', password: 'password123' });
    await request(app).get('/api/v1/super-admin/exchange-requests').set('Authorization', `Bearer ${custToken}`).expect(403);

    const listRes = await request(app)
      .get('/api/v1/super-admin/exchange-requests?status=Pending Inspection')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(1);

    const getRes = await request(app)
      .get(`/api/v1/super-admin/exchange-requests/${exchangeRequest.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(getRes.body.data.status).toBe('Pending Inspection');

    const approveRes = await request(app)
      .patch(`/api/v1/super-admin/exchange-requests/${exchangeRequest.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Inspection Approved' })
      .expect(200);
    expect(approveRes.body.data.status).toBe('Inspection Approved');

    expect((await ExchangeRequest.findById(exchangeRequest.id)).status).toBe('Inspection Approved');
  });
});
