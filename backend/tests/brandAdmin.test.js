import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Invoice } from '../src/modules/brand-admin/invoice.model.js';
import { RateCard } from '../src/modules/brand-admin/rateCard.model.js';
import { ReplacementApproval } from '../src/modules/brand-admin/replacementApproval.model.js';
import { ReverseLogisticsReturn } from '../src/modules/brand-admin/reverseLogisticsReturn.model.js';
import { MasterService } from '../src/modules/brand-admin/masterService.model.js';
import { SubBrand } from '../src/modules/brand-admin/subBrand.model.js';
import { BrandProduct } from '../src/modules/brand-admin/brandProduct.model.js';
import { Team } from '../src/modules/brand-admin/team.model.js';
import { GeneratedDocument } from '../src/modules/brand-admin/generatedDocument.model.js';
import { createServiceRequest, transitionStatus } from '../src/modules/service-requests/serviceRequest.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('brandAdmin');

let app;
let phoneCounter = 9500000000;
function nextPhone() {
  return String(phoneCounter++);
}
let emailCounter = 0;
function nextEmail() {
  return `brand-admin-${emailCounter++}@test.local`;
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

/** Each call creates a brand-new Brand + its own Brand Admin role + a User under
 * it — the "two tenants" isolation pattern this whole file exists to verify. */
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
  const user = await User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('password123') });
  return user;
}

async function seedTechnician() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.TECHNICIAN, phone, name: 'Test Technician', passwordHash: await hashPassword('password123') });
  return Technician.create({ user: user._id, name: 'Test Technician', phone, status: 'Active', availability: 'Available', specs: ['AC'] });
}

async function seedServiceRequestForBrand(brand, customer, technician) {
  let sr = await createServiceRequest({
    user: customer._id,
    technician: technician._id,
    brand: brand._id,
    category: 'AC',
    description: 'Brand-warranty fixture',
    requestMode: 'B2C',
  });
  sr = await transitionStatus(sr.id, 'Assigned', { description: 'fixture' });
  return sr;
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
    Technician.deleteMany({}),
    Brand.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Invoice.deleteMany({}),
    RateCard.deleteMany({}),
    ReplacementApproval.deleteMany({}),
    ReverseLogisticsReturn.deleteMany({}),
    MasterService.deleteMany({}),
    SubBrand.deleteMany({}),
    BrandProduct.deleteMany({}),
    Team.deleteMany({}),
    GeneratedDocument.deleteMany({}),
  ]);
});

describe('cross-tenant isolation — the Phase 7 exit criterion', () => {
  it('brand A admin can never see brand B\'s service requests or invoices', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const brandB = await seedBrandWithAdmin('Brand B');
    const customer = await seedCustomer();
    const technician = await seedTechnician();

    const srA = await seedServiceRequestForBrand(brandA.brand, customer, technician);
    const invoiceA = await Invoice.create({
      brand: brandA.brand._id,
      serviceRequest: srA._id,
      customer: customer._id,
      technician: technician._id,
      serviceCharge: 500,
      total: 500,
    });

    // Brand A sees its own data.
    const listA = await request(app).get('/api/v1/service-requests').set('Authorization', `Bearer ${brandA.token}`).expect(200);
    expect(listA.body.data).toHaveLength(1);
    const invListA = await request(app).get('/api/v1/brand/invoices').set('Authorization', `Bearer ${brandA.token}`).expect(200);
    expect(invListA.body.data).toHaveLength(1);

    // Brand B sees nothing of Brand A's.
    const listB = await request(app).get('/api/v1/service-requests').set('Authorization', `Bearer ${brandB.token}`).expect(200);
    expect(listB.body.data).toHaveLength(0);
    const invListB = await request(app).get('/api/v1/brand/invoices').set('Authorization', `Bearer ${brandB.token}`).expect(200);
    expect(invListB.body.data).toHaveLength(0);

    // Direct-by-id access is forbidden, not just filtered out of lists.
    await request(app).get(`/api/v1/service-requests/${srA.id}`).set('Authorization', `Bearer ${brandB.token}`).expect(403);
    await request(app)
      .patch(`/api/v1/service-requests/${srA.id}/status`)
      .set('Authorization', `Bearer ${brandB.token}`)
      .send({ status: 'Engineer Accepted' })
      .expect(403);
    await request(app).get(`/api/v1/brand/invoices/${invoiceA.id}`).set('Authorization', `Bearer ${brandB.token}`).expect(403);

    // And Brand A can act on its own.
    await request(app)
      .patch(`/api/v1/service-requests/${srA.id}/status`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ status: 'Engineer Accepted' })
      .expect(200);
  });

  it('brand-scoped resources (rate cards, teams, catalog, roles, users) never leak across brands', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const brandB = await seedBrandWithAdmin('Brand B');

    await request(app)
      .put('/api/v1/brand/rate-cards')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ category: 'AC', serviceType: 'Repair', laborRate: 499 })
      .expect(200);
    await request(app)
      .post('/api/v1/brand/teams')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Team A', department: 'Field Service' })
      .expect(201);
    await request(app)
      .post('/api/v1/brand/catalog/master-services')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'AC Repair', type: 'Repair', charge: 499 })
      .expect(201);

    const rateCardsB = await request(app).get('/api/v1/brand/rate-cards').set('Authorization', `Bearer ${brandB.token}`).expect(200);
    expect(rateCardsB.body.data).toHaveLength(0);
    const teamsB = await request(app).get('/api/v1/brand/teams').set('Authorization', `Bearer ${brandB.token}`).expect(200);
    expect(teamsB.body.data).toHaveLength(0);
    const servicesB = await request(app).get('/api/v1/brand/catalog/master-services').set('Authorization', `Bearer ${brandB.token}`).expect(200);
    expect(servicesB.body.data).toHaveLength(0);

    // Brand B's own user list contains only itself, never Brand A's admin.
    const usersB = await request(app).get('/api/v1/brand/users').set('Authorization', `Bearer ${brandB.token}`).expect(200);
    expect(usersB.body.data.every((u) => u.brand === brandB.brand.id)).toBe(true);
  });

  it('rejects a request with no Authorization header, and a non-brand-admin role', async () => {
    await request(app).get('/api/v1/brand/invoices').expect(401);

    const customer = await seedCustomer();
    const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: customer.phone, password: 'password123' });
    await request(app).get('/api/v1/brand/invoices').set('Authorization', `Bearer ${token}`).expect(403);
  });
});

describe('invoices', () => {
  it('computes total server-side and rejects an invoice for another brand\'s service request', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const brandB = await seedBrandWithAdmin('Brand B');
    const customer = await seedCustomer();
    const technician = await seedTechnician();
    const srA = await seedServiceRequestForBrand(brandA.brand, customer, technician);

    const res = await request(app)
      .post('/api/v1/brand/invoices')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ serviceRequest: srA.id, customer: customer.id, technician: technician.id, serviceCharge: 500, partCharge: 100, gst: 108 })
      .expect(201);
    expect(res.body.data.total).toBe(708);

    await request(app)
      .post('/api/v1/brand/invoices')
      .set('Authorization', `Bearer ${brandB.token}`)
      .send({ serviceRequest: srA.id, customer: customer.id, serviceCharge: 100 })
      .expect(403);
  });

  it('updates invoice status', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const customer = await seedCustomer();
    const technician = await seedTechnician();
    const srA = await seedServiceRequestForBrand(brandA.brand, customer, technician);

    const createRes = await request(app)
      .post('/api/v1/brand/invoices')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ serviceRequest: srA.id, customer: customer.id, serviceCharge: 500 })
      .expect(201);

    const updateRes = await request(app)
      .patch(`/api/v1/brand/invoices/${createRes.body.data.id}/status`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ status: 'Paid' })
      .expect(200);
    expect(updateRes.body.data.status).toBe('Paid');
  });
});

describe('rate cards', () => {
  it('upserts on (brand, category, serviceType) instead of duplicating', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');

    await request(app)
      .put('/api/v1/brand/rate-cards')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ category: 'AC', serviceType: 'Repair', laborRate: 499, partsMarkupPercent: 10 })
      .expect(200);
    const secondRes = await request(app)
      .put('/api/v1/brand/rate-cards')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ category: 'AC', serviceType: 'Repair', laborRate: 599 })
      .expect(200);
    expect(secondRes.body.data.laborRate).toBe(599);

    const list = await request(app).get('/api/v1/brand/rate-cards').set('Authorization', `Bearer ${brandA.token}`).expect(200);
    expect(list.body.data).toHaveLength(1);
  });
});

describe('replacement approvals', () => {
  it('creates and transitions status', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const customer = await seedCustomer();
    const technician = await seedTechnician();
    const srA = await seedServiceRequestForBrand(brandA.brand, customer, technician);

    const createRes = await request(app)
      .post('/api/v1/brand/replacement-approvals')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ serviceRequest: srA.id, product: 'AC', reason: 'Compressor dead' })
      .expect(201);
    expect(createRes.body.data.status).toBe('Pending');

    const approveRes = await request(app)
      .patch(`/api/v1/brand/replacement-approvals/${createRes.body.data.id}/status`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ status: 'Approved' })
      .expect(200);
    expect(approveRes.body.data.status).toBe('Approved');
  });
});

describe('reverse logistics returns', () => {
  it('creates and updates transit/verification status', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const technician = await seedTechnician();

    const createRes = await request(app)
      .post('/api/v1/brand/returns')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ technician: technician.id, partName: 'Compressor' })
      .expect(201);

    const updateRes = await request(app)
      .patch(`/api/v1/brand/returns/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ status: 'Verified & Scrapped', damageFlag: false })
      .expect(200);
    expect(updateRes.body.data.status).toBe('Verified & Scrapped');
  });
});

describe('brand catalog — MasterService -> SubBrand -> BrandProduct', () => {
  it('maps master services onto a brand product through a sub-brand', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');

    const msRes = await request(app)
      .post('/api/v1/brand/catalog/master-services')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'AC Repair', type: 'Repair', charge: 499 })
      .expect(201);

    const sbRes = await request(app)
      .post('/api/v1/brand/catalog/sub-brands')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'LG Appliances', category: 'AC' })
      .expect(201);

    const productRes = await request(app)
      .post(`/api/v1/brand/catalog/sub-brands/${sbRes.body.data.id}/products`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'LG Split AC', model: 'LS-Q18', services: [msRes.body.data.id] })
      .expect(201);
    expect(productRes.body.data.services).toHaveLength(1);
    expect(productRes.body.data.services[0].id).toBe(msRes.body.data.id);

    const listRes = await request(app)
      .get(`/api/v1/brand/catalog/sub-brands/${sbRes.body.data.id}/products`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(1);
  });

  it('rejects adding a product under another brand\'s sub-brand', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const brandB = await seedBrandWithAdmin('Brand B');

    const sbRes = await request(app)
      .post('/api/v1/brand/catalog/sub-brands')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'LG Appliances' })
      .expect(201);

    await request(app)
      .post(`/api/v1/brand/catalog/sub-brands/${sbRes.body.data.id}/products`)
      .set('Authorization', `Bearer ${brandB.token}`)
      .send({ name: 'Intruder Product' })
      .expect(403);
  });
});

describe('teams', () => {
  it('creates a team and adds/removes members', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const customer = await seedCustomer();

    const createRes = await request(app)
      .post('/api/v1/brand/teams')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Field Team A', department: 'Field Service', region: 'North' })
      .expect(201);

    const addRes = await request(app)
      .post(`/api/v1/brand/teams/${createRes.body.data.id}/members`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ userId: customer.id })
      .expect(200);
    expect(addRes.body.data.members).toContain(customer.id);

    const removeRes = await request(app)
      .delete(`/api/v1/brand/teams/${createRes.body.data.id}/members/${customer.id}`)
      .set('Authorization', `Bearer ${brandA.token}`)
      .expect(200);
    expect(removeRes.body.data.members).not.toContain(customer.id);
  });
});

describe('brand-scoped roles', () => {
  it('creates a role resolving permission keys, and rejects an unknown key', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    await Permission.create({ key: 'requests:manage', description: 'x', domain: 'requests' });

    const res = await request(app)
      .post('/api/v1/brand/roles')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Support Agent', permissionKeys: ['requests:manage'] })
      .expect(201);
    expect(res.body.data.permissions).toHaveLength(1);
    expect(res.body.data.permissions[0].key).toBe('requests:manage');

    await request(app)
      .post('/api/v1/brand/roles')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Bad Role', permissionKeys: ['not:a:real:key'] })
      .expect(400);
  });
});

describe('brand users', () => {
  it('invites a brand user without ever leaking passwordHash in the response', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');

    const res = await request(app)
      .post('/api/v1/brand/users')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Agent Smith', email: nextEmail(), password: 'password123' })
      .expect(201);

    expect(res.body.data.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/); // bcrypt hash prefix never appears anywhere in the payload

    const listRes = await request(app).get('/api/v1/brand/users').set('Authorization', `Bearer ${brandA.token}`).expect(200);
    expect(JSON.stringify(listRes.body)).not.toMatch(/\$2[aby]\$/);
  });

  it('rejects assigning a role that belongs to a different brand', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const brandB = await seedBrandWithAdmin('Brand B');

    await request(app)
      .post('/api/v1/brand/users')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ name: 'Agent Smith', email: nextEmail(), password: 'password123', assignedRoles: [brandB.role.id] })
      .expect(400);
  });
});

describe('generated documents', () => {
  it('generates a document record scoped to the brand', async () => {
    const brandA = await seedBrandWithAdmin('Brand A');
    const customer = await seedCustomer();
    const technician = await seedTechnician();
    const srA = await seedServiceRequestForBrand(brandA.brand, customer, technician);

    const res = await request(app)
      .post('/api/v1/brand/documents')
      .set('Authorization', `Bearer ${brandA.token}`)
      .send({ type: 'Warranty Certificate', serviceRequest: srA.id })
      .expect(201);
    expect(res.body.data.type).toBe('Warranty Certificate');

    const listRes = await request(app).get('/api/v1/brand/documents').set('Authorization', `Bearer ${brandA.token}`).expect(200);
    expect(listRes.body.data).toHaveLength(1);
  });
});
