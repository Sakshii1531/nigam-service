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
import { Technician } from '../src/modules/technician/technician.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { AssignmentWeighting } from '../src/modules/super-admin/assignmentWeighting.model.js';
import { PlatformSettings } from '../src/modules/super-admin/platformSettings.model.js';
import { SparePartCatalog } from '../src/modules/super-admin/sparePartCatalog.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Revenue } from '../src/modules/super-admin/revenue.model.js';
import { HomeTile } from '../src/modules/super-admin/homeTile.model.js';
import { ServicePageConfig } from '../src/modules/super-admin/servicePageConfig.model.js';
import { Announcement } from '../src/modules/technician/announcement.model.js';
import { ReferralCampaign } from '../src/modules/rewards-loyalty/referralCampaign.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { TechnicianSkill } from '../src/modules/technician/technicianSkill.model.js';
import { Banner } from '../src/modules/super-admin/banner.model.js';
import { Story } from '../src/modules/super-admin/story.model.js';
import { Video } from '../src/modules/super-admin/video.model.js';
import { Advertisement } from '../src/modules/super-admin/advertisement.model.js';
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
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('superAdmin');

let app;
let emailCounter = 0;
function nextEmail() {
  return `super-admin-${emailCounter++}@test.local`;
}


async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
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
    Permission.deleteMany({}),
    Brand.deleteMany({}),
    City.deleteMany({}),
    ServicePartner.deleteMany({}),
    ASM.deleteMany({}),
    Technician.deleteMany({}),
    ExtendedWarrantyOrder.deleteMany({}),
    AssignmentWeighting.deleteMany({}),
    PlatformSettings.deleteMany({}),
    SparePartCatalog.deleteMany({}),
    Escalation.deleteMany({}),
    AuditLog.deleteMany({}),
    Revenue.deleteMany({}),
    HomeTile.deleteMany({}),
    ServicePageConfig.deleteMany({}),
    Announcement.deleteMany({}),
    ReferralCampaign.deleteMany({}),
    AMCSubscription.deleteMany({}),
    AMCPlan.deleteMany({}),
    TechnicianSkill.deleteMany({}),
    Banner.deleteMany({}),
    Story.deleteMany({}),
    Video.deleteMany({}),
    Advertisement.deleteMany({}),
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

  it('reports each ASM\'s region name and live open-job count across their partners', async () => {
    const { token } = await seedSuperAdmin();
    const city = await City.create({ name: 'Kanpur', state: 'UP' });
    const partner = await ServicePartner.create({ name: 'NCC Kanpur', city: city._id });
    const otherPartner = await ServicePartner.create({ name: 'NCC Elsewhere', city: city._id });

    const customer = await User.create({ role: ROLES.CUSTOMER, phone: '9700000010', name: 'C', passwordHash: await hashPassword('x') });
    const techUser = await User.create({ role: ROLES.TECHNICIAN, phone: '9700000011', name: 'T', passwordHash: await hashPassword('x') });
    const tech = await Technician.create({ user: techUser._id, name: 'T', servicePartner: partner._id, status: 'Active' });

    // Two open, one Closed and one Cancelled — only the open pair should count.
    await ServiceRequest.create({ user: customer._id, technician: tech._id, category: 'AC', status: 'Assigned', timeline: [] });
    await ServiceRequest.create({ user: customer._id, technician: tech._id, category: 'AC', status: 'Diagnosis Done', timeline: [] });
    await ServiceRequest.create({ user: customer._id, technician: tech._id, category: 'AC', status: 'Closed', timeline: [] });
    await ServiceRequest.create({ user: customer._id, technician: tech._id, category: 'AC', status: 'Cancelled', timeline: [] });

    const asm = await ASM.create({ name: 'Amit Singh', city: city._id, partners: [partner._id, otherPartner._id] });

    const res = await request(app)
      .get('/api/v1/super-admin/asms')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const row = res.body.data.find((a) => a.id === asm.id);
    expect(row.city.name).toBe('Kanpur');
    expect(row.activeJobs).toBe(2);
    expect(row.partners).toHaveLength(2);
  });

  it('reports zero open jobs for an ASM with no partners', async () => {
    const { token } = await seedSuperAdmin();
    const city = await City.create({ name: 'Patna', state: 'BR' });
    await ASM.create({ name: 'Solo', city: city._id, partners: [] });

    const res = await request(app)
      .get('/api/v1/super-admin/asms')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data[0].activeJobs).toBe(0);
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

  it('resolves city, manager and ticket refs in the list so the desk can render them', async () => {
    const { token } = await seedSuperAdmin();
    const customer = await User.create({ role: ROLES.CUSTOMER, phone: '9700000003', name: 'C', passwordHash: await hashPassword('x') });
    const city = await City.create({ name: 'Lucknow', state: 'UP' });
    const sr = await ServiceRequest.create({ user: customer._id, category: 'AC', status: 'New', timeline: [] });
    const manager = await User.create({ role: ROLES.SUPER_ADMIN, email: nextEmail(), name: 'Rajesh Kumar', passwordHash: await hashPassword('x') });

    const createRes = await request(app)
      .post('/api/v1/super-admin/escalations')
      .set('Authorization', `Bearer ${token}`)
      .send({ serviceRequest: sr.id, city: city.id, reason: 'SLA breach', priority: 'High' })
      .expect(201);

    await request(app)
      .patch(`/api/v1/super-admin/escalations/${createRes.body.data.id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ managerId: manager.id })
      .expect(200);

    const listRes = await request(app)
      .get('/api/v1/super-admin/escalations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const [row] = listRes.body.data;
    expect(row.city.name).toBe('Lucknow');
    expect(row.manager.name).toBe('Rajesh Kumar');
    expect(row.serviceRequest.humanId).toBeDefined();
  });
});

describe('Audit logs', () => {
  it('resolves the acting user so the log viewer shows a name, not an id', async () => {
    const { token, email } = await seedSuperAdmin();
    const actor = await User.findOne({ email });

    await AuditLog.create({ user: actor._id, action: 'Approved Brand LG', type: 'System' });
    await AuditLog.create({ user: null, action: 'Low stock alert', type: 'Inventory' });

    const res = await request(app)
      .get('/api/v1/super-admin/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const byAction = Object.fromEntries(res.body.data.map((l) => [l.action, l]));
    expect(byAction['Approved Brand LG'].user.name).toBe('Super Admin');
    // System-generated entries have no actor and must still serialise cleanly.
    expect(byAction['Low stock alert'].user).toBeNull();
  });

  it('filters by type', async () => {
    const { token } = await seedSuperAdmin();
    await AuditLog.create({ action: 'a', type: 'Finance' });
    await AuditLog.create({ action: 'b', type: 'Support' });

    const res = await request(app)
      .get('/api/v1/super-admin/audit-logs?type=Finance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('Finance');
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

describe('CMS — console readers see unpublished content the apps must not', () => {
  it('hides a Scheduled story from the app but shows it to the console', async () => {
    const { token } = await seedSuperAdmin();
    await Story.create({ title: 'Live now', type: 'Promo Banner', status: 'Active' });
    await Story.create({ title: 'Goes out Monday', type: 'Promo Banner', status: 'Scheduled' });

    const publicRes = await request(app).get('/api/v1/cms/stories').expect(200);
    expect(publicRes.body.data.map((s) => s.title)).toEqual(['Live now']);

    const adminRes = await request(app)
      .get('/api/v1/cms/stories/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(adminRes.body.data).toHaveLength(2);
  });

  it('hides a Paused campaign from the app but shows it to the console', async () => {
    const { token } = await seedSuperAdmin();
    await Advertisement.create({ name: 'Running one', type: 'Category Popup', status: 'Running' });
    await Advertisement.create({ name: 'Paused one', type: 'Category Popup', status: 'Paused' });

    const publicRes = await request(app).get('/api/v1/cms/advertisements').expect(200);
    expect(publicRes.body.data).toHaveLength(1);

    const adminRes = await request(app)
      .get('/api/v1/cms/advertisements/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(adminRes.body.data).toHaveLength(2);

    const filtered = await request(app)
      .get('/api/v1/cms/advertisements/admin?status=Paused')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(filtered.body.data.map((a) => a.name)).toEqual(['Paused one']);
  });

  it('hides deactivated videos and banners from the app but shows them to the console', async () => {
    const { token } = await seedSuperAdmin();
    await Video.create({ title: 'Live video', isActive: true });
    await Video.create({ title: 'Retired video', isActive: false });
    await Banner.create({ imageUrl: 'a.png', app: 'customer', isActive: true });
    await Banner.create({ imageUrl: 'b.png', app: 'customer', isActive: false });

    expect((await request(app).get('/api/v1/cms/videos').expect(200)).body.data).toHaveLength(1);
    expect((await request(app).get('/api/v1/cms/banners').expect(200)).body.data).toHaveLength(1);

    const videos = await request(app)
      .get('/api/v1/cms/videos/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(videos.body.data).toHaveLength(2);

    const banners = await request(app)
      .get('/api/v1/cms/banners/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(banners.body.data).toHaveLength(2);
  });

  it('keeps every console reader closed to unauthenticated callers', async () => {
    for (const path of ['stories', 'videos', 'advertisements', 'banners']) {
      await request(app).get(`/api/v1/cms/${path}/admin`).expect(401);
    }
  });
});

describe('Warranty registration verification', () => {
  async function seedRegistration(overrides = {}) {
    const customer = await User.create({
      role: ROLES.CUSTOMER,
      phone: `97000001${String(emailCounter++).padStart(2, '0')}`,
      name: 'Anil Kumar',
      passwordHash: await hashPassword('x'),
    });
    return ExtendedWarrantyOrder.create({
      user: customer._id,
      fullName: 'Anil Kumar',
      email: 'anil@example.com',
      brand: 'LG',
      applianceCategory: 'AC',
      modelNumber: 'LSA5NP2A',
      price: 799,
      invoiceFileUrl: 'https://example.com/invoice.pdf',
      ...overrides,
    });
  }

  it('defaults a new registration to Pending verification, independent of coverage status', async () => {
    const { token } = await seedSuperAdmin();
    const order = await seedRegistration();
    expect(order.verificationStatus).toBe('Pending');
    expect(order.status).toBe('Active');

    const res = await request(app)
      .get('/api/v1/super-admin/warranty-registrations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].user.name).toBe('Anil Kumar');
  });

  it('approves a registration and writes an audit entry', async () => {
    const { token } = await seedSuperAdmin();
    const order = await seedRegistration();

    const res = await request(app)
      .patch(`/api/v1/super-admin/warranty-registrations/${order.id}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verificationStatus: 'Approved' })
      .expect(200);

    expect(res.body.data.verificationStatus).toBe('Approved');
    expect(res.body.data.verifiedAt).toBeDefined();
    // Coverage status is a separate axis and must be untouched by verification.
    expect(res.body.data.status).toBe('Active');

    const audit = await AuditLog.findOne({ type: 'System' });
    expect(audit.action).toMatch(/Approved warranty registration/);
  });

  it('filters by verification status', async () => {
    const { token } = await seedSuperAdmin();
    await seedRegistration();
    await seedRegistration({ verificationStatus: 'Rejected' });

    const res = await request(app)
      .get('/api/v1/super-admin/warranty-registrations?verificationStatus=Pending')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('rejects Pending as a decision and 404s an unknown registration', async () => {
    const { token } = await seedSuperAdmin();
    const order = await seedRegistration();

    await request(app)
      .patch(`/api/v1/super-admin/warranty-registrations/${order.id}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verificationStatus: 'Pending' })
      .expect(400);

    await request(app)
      .patch(`/api/v1/super-admin/warranty-registrations/${new mongoose.Types.ObjectId()}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verificationStatus: 'Approved' })
      .expect(404);
  });

  it('is closed to non-super-admins', async () => {
    await request(app).get('/api/v1/super-admin/warranty-registrations').expect(401);
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

describe('platform analytics', () => {
  it('buckets the fifteen request statuses into the five the dashboard renders', async () => {
    const { token } = await seedSuperAdmin();
    const customer = await User.create({ role: ROLES.CUSTOMER, phone: '9700000200', name: 'C', passwordHash: await hashPassword('x') });

    await ServiceRequest.create({ user: customer._id, category: 'AC', status: 'New', timeline: [] });
    await ServiceRequest.create({ user: customer._id, category: 'AC', status: 'Assigned', timeline: [] });
    await ServiceRequest.create({ user: customer._id, category: 'AC', status: 'Diagnosis Done', timeline: [] });
    await ServiceRequest.create({ user: customer._id, category: 'AC', status: 'Closed', timeline: [] });
    await ServiceRequest.create({ user: customer._id, category: 'AC', status: 'Cancelled', timeline: [] });

    const res = await request(app)
      .get('/api/v1/super-admin/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const r = res.body.data.requests;
    expect(r.open).toBe(1);
    expect(r.assigned).toBe(1);
    // Anything mid-flight collapses into one bucket.
    expect(r.inProgress).toBe(1);
    expect(r.completed).toBe(1);
    expect(r.cancelled).toBe(1);
    expect(r.total).toBe(5);
    // Active excludes both terminal states.
    expect(res.body.data.activeRequests).toBe(3);
  });

  it('sums revenue and counts open escalations only', async () => {
    const { token } = await seedSuperAdmin();
    const customer = await User.create({ role: ROLES.CUSTOMER, phone: '9700000201', name: 'C', passwordHash: await hashPassword('x') });
    const sr = await ServiceRequest.create({ user: customer._id, category: 'AC', status: 'New', timeline: [] });

    await Revenue.create({ source: 'Bookings', gross: 1000, partnerShare: 400, net: 600, marginPercent: 60 });
    await Revenue.create({ source: 'AMC', gross: 500, partnerShare: 0, net: 500, marginPercent: 100 });
    await Escalation.create({ scope: 'platform', serviceRequest: sr._id, status: 'Open' });
    await Escalation.create({ scope: 'platform', serviceRequest: sr._id, status: 'Resolved' });

    const res = await request(app)
      .get('/api/v1/super-admin/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.revenue).toEqual({ gross: 1500, net: 1100 });
    expect(res.body.data.openEscalations).toBe(1);
  });

  it('splits reports by city via the assigned technician, and reports what it excluded', async () => {
    const { token } = await seedSuperAdmin();
    const city = await City.create({ name: 'Chennai', state: 'TN' });
    const customer = await User.create({ role: ROLES.CUSTOMER, phone: '9700000202', name: 'C', passwordHash: await hashPassword('x') });
    const techUser = await User.create({ role: ROLES.TECHNICIAN, phone: '9700000203', name: 'T', passwordHash: await hashPassword('x') });
    const tech = await Technician.create({ user: techUser._id, name: 'T', city: city._id, status: 'Active' });

    await ServiceRequest.create({ user: customer._id, technician: tech._id, category: 'AC', status: 'New', timeline: [] });
    // Unassigned requests have no city and must not silently vanish from the totals.
    await ServiceRequest.create({ user: customer._id, category: 'TV', status: 'New', timeline: [] });

    const res = await request(app)
      .get('/api/v1/super-admin/analytics/reports')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.requestsByCity).toEqual([{ label: 'Chennai', count: 1 }]);
    expect(res.body.data.requestsWithoutTechnician).toBe(1);
    expect(res.body.data.requestsByCategory).toEqual(
      expect.arrayContaining([{ label: 'AC', count: 1 }, { label: 'TV', count: 1 }]),
    );
  });

  it('is closed to non-super-admins', async () => {
    await request(app).get('/api/v1/super-admin/analytics/dashboard').expect(401);
    await request(app).get('/api/v1/super-admin/analytics/reports').expect(401);
  });
});

describe('CMS story slides', () => {
  it('round-trips the slide sequence the customer viewer pages through', async () => {
    const { token } = await seedSuperAdmin();
    const slides = [
      { image: 'a.png', caption: 'First', subCaption: 'One' },
      { image: 'b.png', caption: 'Second', subCaption: 'Two' },
    ];

    const createRes = await request(app)
      .post('/api/v1/cms/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Winter geyser care', type: 'Customer Help Slider', mediaUrl: 'a.png', slides })
      .expect(201);

    expect(createRes.body.data.slides).toHaveLength(2);
    expect(createRes.body.data.slides[1].caption).toBe('Second');

    // The customer app reads the public endpoint — slides must survive there too.
    const publicRes = await request(app).get('/api/v1/cms/stories').expect(200);
    const story = publicRes.body.data.find((s) => s.title === 'Winter geyser care');
    expect(story.slides).toHaveLength(2);
    expect(story.slides[0].image).toBe('a.png');
  });

  it('accepts a story with no slides at all', async () => {
    const { token } = await seedSuperAdmin();
    const res = await request(app)
      .post('/api/v1/cms/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cover only', type: 'Promo Banner', mediaUrl: 'cover.png' })
      .expect(201);
    expect(res.body.data.slides).toEqual([]);
  });
});

describe('CMS home tiles', () => {
  it('keeps placements separate so one slot never bleeds into another', async () => {
    const { token } = await seedSuperAdmin();
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    await request(app).post('/api/v1/cms/home-tiles').set(auth.headers)
      .send({ placement: 'most-booked', title: 'Foam-jet AC service', price: 649, rating: 4.76, badge: 'Instant' })
      .expect(201);
    await request(app).post('/api/v1/cms/home-tiles').set(auth.headers)
      .send({ placement: 'category', title: 'AC', icon: 'ac', service: 'AC Repair' })
      .expect(201);

    const mostBooked = await request(app).get('/api/v1/cms/home-tiles?placement=most-booked').expect(200);
    expect(mostBooked.body.data).toHaveLength(1);
    expect(mostBooked.body.data[0].price).toBe(649);

    const categories = await request(app).get('/api/v1/cms/home-tiles?placement=category').expect(200);
    expect(categories.body.data).toHaveLength(1);
    expect(categories.body.data[0].icon).toBe('ac');
    // A category chip carries no price — unused fields stay unset, not zeroed.
    expect(categories.body.data[0].price).toBeUndefined();
  });

  it('hides a deactivated tile from the app but shows it to the console', async () => {
    const { token } = await seedSuperAdmin();
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const created = await request(app).post('/api/v1/cms/home-tiles').set(auth.headers)
      .send({ placement: 'dashboard-service', title: 'Retired Service' })
      .expect(201);

    await request(app).put(`/api/v1/cms/home-tiles/${created.body.data.id}`).set(auth.headers)
      .send({ isActive: false })
      .expect(200);

    const publicRes = await request(app).get('/api/v1/cms/home-tiles?placement=dashboard-service').expect(200);
    expect(publicRes.body.data).toHaveLength(0);

    const adminRes = await request(app)
      .get('/api/v1/cms/home-tiles/admin?placement=dashboard-service')
      .set(auth.headers)
      .expect(200);
    expect(adminRes.body.data).toHaveLength(1);
  });

  it('orders tiles within a placement by sortOrder', async () => {
    const { token } = await seedSuperAdmin();
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    await request(app).post('/api/v1/cms/home-tiles').set(auth.headers)
      .send({ placement: 'appliance-service', title: 'Second', sortOrder: 2 }).expect(201);
    await request(app).post('/api/v1/cms/home-tiles').set(auth.headers)
      .send({ placement: 'appliance-service', title: 'First', sortOrder: 1 }).expect(201);

    const res = await request(app).get('/api/v1/cms/home-tiles?placement=appliance-service').expect(200);
    expect(res.body.data.map((t) => t.title)).toEqual(['First', 'Second']);
  });

  it('rejects an unknown placement and closes writes to non-admins', async () => {
    const { token } = await seedSuperAdmin();
    await request(app).post('/api/v1/cms/home-tiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ placement: 'nowhere', title: 'X' })
      .expect(400);

    await request(app).post('/api/v1/cms/home-tiles').send({ placement: 'category', title: 'X' }).expect(401);
    await request(app).get('/api/v1/cms/home-tiles/admin').expect(401);
  });
});

describe('CMS service page configs', () => {
  it('stores hero copy and its catalog as one document per service', async () => {
    const { token } = await seedSuperAdmin();

    const res = await request(app)
      .put('/api/v1/cms/service-pages/AC%20Repair')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tagline: 'Cool Again Today',
        subtitle: 'Certified AC Technicians',
        subServices: 'Book a consultation, Gas Refilling',
        catalog: [
          {
            section: 'Book a consultation',
            items: [{ name: 'Standard Consultancy', rating: 4.4, reviews: 38, price: '₹149', time: '1 hrs', bullets: ['Detailed inspection'] }],
          },
        ],
      })
      .expect(200);

    expect(res.body.data.serviceKey).toBe('AC Repair');
    expect(res.body.data.catalog[0].items[0].bullets).toEqual(['Detailed inspection']);

    // The customer app reads this without auth.
    const publicRes = await request(app).get('/api/v1/cms/service-pages/AC%20Repair').expect(200);
    expect(publicRes.body.data.tagline).toBe('Cool Again Today');
  });

  it('upserts rather than requiring the service to exist first', async () => {
    const { token } = await seedSuperAdmin();
    await request(app)
      .put('/api/v1/cms/service-pages/Plumber')
      .set('Authorization', `Bearer ${token}`)
      .send({ tagline: 'Leak Fixed Fast' })
      .expect(200);

    const second = await request(app)
      .put('/api/v1/cms/service-pages/Plumber')
      .set('Authorization', `Bearer ${token}`)
      .send({ tagline: 'Updated' })
      .expect(200);

    expect(second.body.data.tagline).toBe('Updated');
    expect(await ServicePageConfig.countDocuments({ serviceKey: 'Plumber' })).toBe(1);
  });

  it('ignores a body-supplied serviceKey so one service cannot overwrite another', async () => {
    const { token } = await seedSuperAdmin();
    const res = await request(app)
      .put('/api/v1/cms/service-pages/Electrician')
      .set('Authorization', `Bearer ${token}`)
      .send({ serviceKey: 'AC Repair', tagline: 'Power Back On' })
      .expect(200);

    expect(res.body.data.serviceKey).toBe('Electrician');
    expect(await ServicePageConfig.countDocuments({ serviceKey: 'AC Repair' })).toBe(0);
  });

  it('404s an unconfigured service and closes writes to non-admins', async () => {
    await request(app).get('/api/v1/cms/service-pages/Nonexistent').expect(404);
    await request(app).put('/api/v1/cms/service-pages/AC%20Repair').send({ tagline: 'x' }).expect(401);
  });
});

describe('CMS technician app content — announcements and skill catalogue', () => {
  it('broadcasts an announcement that the technician app then reads', async () => {
    const { token } = await seedSuperAdmin();

    const created = await request(app)
      .post('/api/v1/cms/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'App v2.4 ships tonight at 12:00 AM.', scope: 'city', region: 'Delhi & NCR' })
      .expect(201);

    expect(created.body.data.region).toBe('Delhi & NCR');
    expect(created.body.data.severity).toBe('Info');

    const listed = await request(app)
      .get('/api/v1/cms/announcements')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);

    await request(app)
      .put(`/api/v1/cms/announcements/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ severity: 'Critical' })
      .expect(200);
    expect((await Announcement.findById(created.body.data.id)).severity).toBe('Critical');

    await request(app)
      .delete(`/api/v1/cms/announcements/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(await Announcement.countDocuments()).toBe(0);
  });

  it('keeps announcement authoring admin-only', async () => {
    await request(app).get('/api/v1/cms/announcements').expect(401);
    await request(app).post('/api/v1/cms/announcements').send({ message: 'x' }).expect(401);
  });

  it('rejects a duplicate skill code with 409 rather than a 500', async () => {
    const { token } = await seedSuperAdmin();

    await request(app)
      .post('/api/v1/cms/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Split AC Installation', code: 'AC-SPLIT-INST', group: 'HVAC' })
      .expect(201);

    const dup = await request(app)
      .post('/api/v1/cms/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Another name entirely', code: 'AC-SPLIT-INST' })
      .expect(409);
    expect(dup.body.error.message).toMatch(/already exists/);

    expect(await TechnicianSkill.countDocuments()).toBe(1);
  });

  it('exposes the skill catalogue publicly so the technician profile can offer it', async () => {
    const { token } = await seedSuperAdmin();
    const created = await request(app)
      .post('/api/v1/cms/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'RO Membrane Cleaning', code: 'RO-MEM-CLN', group: 'Water Purifier' })
      .expect(201);

    const publicRes = await request(app).get('/api/v1/cms/skills').expect(200);
    expect(publicRes.body.data[0].code).toBe('RO-MEM-CLN');

    // Writes stay closed.
    await request(app).post('/api/v1/cms/skills').send({ name: 'x', code: 'Y' }).expect(401);
    await request(app).delete(`/api/v1/cms/skills/${created.body.data.id}`).expect(401);

    await request(app)
      .delete(`/api/v1/cms/skills/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(await TechnicianSkill.countDocuments()).toBe(0);
  });

  it('carries banner title/copy and video category through, which the technician console renders', async () => {
    const { token } = await seedSuperAdmin();

    const banner = await request(app)
      .post('/api/v1/cms/banners')
      .set('Authorization', `Bearer ${token}`)
      .send({ imageUrl: 'https://cdn/x.png', title: 'Safety First Protocol', description: 'Mask & gloves on all jobs.', app: 'technician' })
      .expect(201);
    expect(banner.body.data.title).toBe('Safety First Protocol');
    expect(banner.body.data.description).toBe('Mask & gloves on all jobs.');

    // The technician console filters by app, so a customer banner must not leak in.
    await request(app)
      .post('/api/v1/cms/banners')
      .set('Authorization', `Bearer ${token}`)
      .send({ imageUrl: 'https://cdn/customer.png', app: 'customer' })
      .expect(201);

    const techOnly = await request(app)
      .get('/api/v1/cms/banners/admin?app=technician')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(techOnly.body.data).toHaveLength(1);

    const video = await request(app)
      .post('/api/v1/cms/videos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Inverter AC Troubleshooting', category: 'AC Service', duration: '12 mins' })
      .expect(201);
    expect(video.body.data.category).toBe('AC Service');
  });
});

describe('referral campaigns', () => {
  it('creates, lists, updates and deletes a campaign', async () => {
    const { token } = await seedSuperAdmin();
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post('/api/v1/super-admin/loyalty/referral-campaigns')
      .set(auth)
      .send({ name: 'AC Season Special', bonus: 200, discount: 15 })
      .expect(201);
    expect(created.body.data.status).toBe('Active');

    const listed = await request(app).get('/api/v1/super-admin/loyalty/referral-campaigns').set(auth).expect(200);
    expect(listed.body.data).toHaveLength(1);

    await request(app)
      .put(`/api/v1/super-admin/loyalty/referral-campaigns/${created.body.data.id}`)
      .set(auth)
      .send({ status: 'Inactive' })
      .expect(200);
    expect((await ReferralCampaign.findById(created.body.data.id)).status).toBe('Inactive');

    await request(app)
      .delete(`/api/v1/super-admin/loyalty/referral-campaigns/${created.body.data.id}`)
      .set(auth)
      .expect(200);
    expect(await ReferralCampaign.countDocuments()).toBe(0);
  });

  it('rejects a discount over 100% and is closed to non-admins', async () => {
    const { token } = await seedSuperAdmin();
    await request(app)
      .post('/api/v1/super-admin/loyalty/referral-campaigns')
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: 'Impossible', discount: 150 })
      .expect(400);

    await request(app).get('/api/v1/super-admin/loyalty/referral-campaigns').expect(401);
  });
});

describe('platform-wide AMC console', () => {
  async function seedSubscription({ planName, price, status = 'Active', expiryDate }) {
    const plan = await AMCPlan.create({ name: planName, price, visitsTotal: 4 });
    const user = await User.create({
      role: ROLES.CUSTOMER,
      phone: `92${Math.floor(10000000 + Math.random() * 89999999)}`,
      name: 'AMC Customer',
      passwordHash: await hashPassword('password123'),
    });
    return AMCSubscription.create({
      user: user._id, plan: plan._id, status, expiryDate, visitsTotal: 4, visitsRemaining: 4, brand: 'LG', model: 'X1',
    });
  }

  it('lists every customer\'s subscription, not just the calling admin\'s', async () => {
    const { token } = await seedSuperAdmin();
    await seedSubscription({ planName: 'Gold AMC', price: 4999 });
    await seedSubscription({ planName: 'Platinum AMC', price: 9999 });

    const res = await request(app)
      .get('/api/v1/super-admin/amc/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // The admin owns none of these — the customer-scoped route would return [].
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].user.name).toBe('AMC Customer');
    expect(res.body.data[0].plan.name).toBeDefined();
    expect(res.body.meta.total).toBe(2);
  });

  it('summarises sales, active count, most-sold plan and expiries across all rows', async () => {
    const { token } = await seedSuperAdmin();
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const later = new Date();
    later.setDate(later.getDate() + 90);

    await seedSubscription({ planName: 'Gold AMC', price: 4999, expiryDate: soon });
    await seedSubscription({ planName: 'Gold AMC', price: 4999, expiryDate: later });
    await seedSubscription({ planName: 'Platinum AMC', price: 9999, status: 'Expired', expiryDate: later });

    const res = await request(app)
      .get('/api/v1/super-admin/amc/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.totalSales).toBe(4999 + 4999 + 9999);
    expect(res.body.data.activeContracts).toBe(2);
    expect(res.body.data.mostSoldPlan).toBe('Gold AMC');
    expect(res.body.data.expiringSoon).toBe(1);
  });

  it('reports zeros and a null plan on an empty platform rather than inventing figures', async () => {
    const { token } = await seedSuperAdmin();
    const res = await request(app)
      .get('/api/v1/super-admin/amc/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toMatchObject({ totalSales: 0, activeContracts: 0, mostSoldPlan: null, expiringSoon: 0 });
  });

  it('is closed to non-super-admins', async () => {
    await request(app).get('/api/v1/super-admin/amc/subscriptions').expect(401);
    await request(app).get('/api/v1/super-admin/amc/summary').expect(401);
  });
});

describe('dashboard trends, retention and coin redemption', () => {
  it('returns a dense daily series and a change against the previous window', async () => {
    const { token } = await seedSuperAdmin();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Ten days back lands in the previous 7-day window, which is the baseline.
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    await Revenue.create({ source: 'Bookings', periodStart: today, gross: 1000, net: 800 });
    await Revenue.create({ source: 'AMC', periodStart: yesterday, gross: 500, net: 400 });
    await Revenue.create({ source: 'Bookings', periodStart: tenDaysAgo, gross: 750, net: 600 });

    const res = await request(app)
      .get('/api/v1/super-admin/analytics/revenue-trend?days=7')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // One point per day, including the days with no revenue at all.
    expect(res.body.data.points).toHaveLength(7);
    expect(res.body.data.total).toBe(1500);
    expect(res.body.data.previousTotal).toBe(750);
    expect(res.body.data.changePercent).toBe(100);
  });

  it('reports a null change rather than infinity when the baseline is zero', async () => {
    const { token } = await seedSuperAdmin();
    await Revenue.create({ source: 'Bookings', periodStart: new Date(), gross: 400, net: 300 });

    const res = await request(app)
      .get('/api/v1/super-admin/analytics/revenue-trend?days=7')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.previousTotal).toBe(0);
    expect(res.body.data.changePercent).toBeNull();
  });

  it('rejects a window the dashboard cannot render', async () => {
    const { token } = await seedSuperAdmin();
    await request(app)
      .get('/api/v1/super-admin/analytics/revenue-trend?days=90')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('counts requests per day on the same windowing', async () => {
    const { token } = await seedSuperAdmin();
    const customer = await User.create({
      role: ROLES.CUSTOMER, phone: '9200000701', name: 'Trend Customer', passwordHash: await hashPassword('password123'),
    });
    await ServiceRequest.create({ user: customer._id, category: 'AC', description: 'today' });

    const res = await request(app)
      .get('/api/v1/super-admin/analytics/request-trend?days=7')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.points).toHaveLength(7);
    expect(res.body.data.total).toBe(1);
  });

  it('derives the return rate from customers with more than one request', async () => {
    const { token } = await seedSuperAdmin();
    const repeat = await User.create({
      role: ROLES.CUSTOMER, phone: '9200000702', name: 'Repeat', passwordHash: await hashPassword('password123'),
    });
    const once = await User.create({
      role: ROLES.CUSTOMER, phone: '9200000703', name: 'Once', passwordHash: await hashPassword('password123'),
    });
    await ServiceRequest.create({ user: repeat._id, category: 'AC' });
    await ServiceRequest.create({ user: repeat._id, category: 'TV' });
    await ServiceRequest.create({ user: once._id, category: 'AC' });

    const res = await request(app)
      .get('/api/v1/super-admin/analytics/retention')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toMatchObject({ customers: 2, returning: 1, returnRatePercent: 50 });
  });

  it('returns a null return rate when nobody has booked, not 0%', async () => {
    const { token } = await seedSuperAdmin();
    const res = await request(app)
      .get('/api/v1/super-admin/analytics/retention')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.returnRatePercent).toBeNull();
  });
});
