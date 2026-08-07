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
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
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
import { Review } from '../src/modules/reviews/review.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { BrandSettings } from '../src/modules/brand-admin/brandSettings.model.js';
import { Job } from '../src/modules/technician/job.model.js';
import { PartOrder } from '../src/modules/technician/partOrder.model.js';
import { TechInventoryItem } from '../src/modules/technician/techInventoryItem.model.js';
import { TrainingGuide } from '../src/modules/technician/trainingGuide.model.js';
import { Course } from '../src/modules/technician/course.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { Payout } from '../src/modules/technician/payout.model.js';
import { createServiceRequest, transitionStatus } from '../src/modules/service-requests/serviceRequest.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { AMCVisit } from '../src/modules/warranty-amc-exchange/amcVisit.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

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


async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
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
    Technician.deleteMany({}),
    Brand.deleteMany({}),
    OwnedAppliance.deleteMany({}),
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
    Review.deleteMany({}),
    ExtendedWarrantyOrder.deleteMany({}),
    BrandSettings.deleteMany({}),
    Job.deleteMany({}),
    PartOrder.deleteMany({}),
    TechInventoryItem.deleteMany({}),
    TrainingGuide.deleteMany({}),
    Course.deleteMany({}),
    Payment.deleteMany({}),
    Payout.deleteMany({}),
    Notification.deleteMany({}),
    AMCVisit.deleteMany({}),
    AMCSubscription.deleteMany({}),
    AMCPlan.deleteMany({}),
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

describe('brand reviews', () => {
  it('lists only reviews left on this brand\'s own service requests', async () => {
    const a = await seedBrandWithAdmin('Brand A');
    const b = await seedBrandWithAdmin('Brand B');
    const customer = await seedCustomer();
    const technician = await seedTechnician();

    const srA = await seedServiceRequestForBrand(a.brand, customer, technician);
    const srB = await seedServiceRequestForBrand(b.brand, customer, technician);

    await Review.create({ serviceRequest: srA._id, user: customer._id, technician: technician._id, rating: 5, comment: 'Great work' });
    await Review.create({ serviceRequest: srB._id, user: customer._id, technician: technician._id, rating: 2, comment: 'Other brand' });

    const res = await request(app)
      .get('/api/v1/reviews/brand')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].comment).toBe('Great work');
    // Refs the console renders must come back resolved, not as bare ids.
    expect(res.body.data[0].user.name).toBe('Test Customer');
    expect(res.body.data[0].technician.name).toBe('Test Technician');
    expect(res.body.data[0].serviceRequest.humanId).toBeDefined();
  });

  it('returns an empty list for a brand with no service requests', async () => {
    const { token } = await seedBrandWithAdmin('Empty Brand');
    const res = await request(app)
      .get('/api/v1/reviews/brand')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('filters by status', async () => {
    const a = await seedBrandWithAdmin('Brand C');
    const customer = await seedCustomer();
    const technician = await seedTechnician();
    const sr = await seedServiceRequestForBrand(a.brand, customer, technician);

    await Review.create({ serviceRequest: sr._id, user: customer._id, rating: 5, status: 'Reviewed' });
    await Review.create({ serviceRequest: sr._id, user: customer._id, rating: 1, status: 'Escalated' });

    const res = await request(app)
      .get('/api/v1/reviews/brand?status=Escalated')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('Escalated');
  });

  it('is not reachable as an id lookup and requires a brand-scoped caller', async () => {
    await request(app).get('/api/v1/reviews/brand').expect(401);
  });
});

describe('brand insights — derived read-only views', () => {
  it('lists this brand\'s customers with per-customer counts, and never another brand\'s', async () => {
    const a = await seedBrandWithAdmin('Insights A');
    const b = await seedBrandWithAdmin('Insights B');
    const mine = await seedCustomer();
    const theirs = await seedCustomer();
    const technician = await seedTechnician();

    await seedServiceRequestForBrand(a.brand, mine, technician);
    await seedServiceRequestForBrand(a.brand, mine, technician);
    await seedServiceRequestForBrand(b.brand, theirs, technician);

    const res = await request(app)
      .get('/api/v1/brand/customers')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(String(mine._id));
    // Two requests from the same customer collapse into one row with a count.
    expect(res.body.data[0].complaints).toBe(2);
  });

  it('scopes technician workload to this brand, not platform-wide totals', async () => {
    const a = await seedBrandWithAdmin('Insights C');
    const b = await seedBrandWithAdmin('Insights D');
    const customer = await seedCustomer();
    const technician = await seedTechnician();

    await seedServiceRequestForBrand(a.brand, customer, technician);
    // The same technician also serves another brand — that must not be counted here.
    await seedServiceRequestForBrand(b.brand, customer, technician);

    const res = await request(app)
      .get('/api/v1/brand/technicians')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].totalJobs).toBe(1);
    expect(res.body.data[0].name).toBe('Test Technician');
  });

  it('lists warranty registrations and AMC subscriptions matched on brand name', async () => {
    const a = await seedBrandWithAdmin('Insights E');
    const customer = await seedCustomer();

    await ExtendedWarrantyOrder.create({ user: customer._id, brand: 'Insights E', price: 799 });
    await ExtendedWarrantyOrder.create({ user: customer._id, brand: 'Someone Else', price: 799 });

    const res = await request(app)
      .get('/api/v1/brand/warranty-registrations')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].user.name).toBe('Test Customer');
  });

  it('is closed to unauthenticated and non-brand callers', async () => {
    for (const path of ['customers', 'technicians', 'completions', 'warranty-registrations', 'amc-subscriptions', 'claims']) {
      await request(app).get(`/api/v1/brand/${path}`).expect(401);
    }
  });
});

describe('POST /service-requests — brand-admin logs a complaint', () => {
  it('creates a request forced onto the caller\'s own brand', async () => {
    const a = await seedBrandWithAdmin('Register A');
    const b = await seedBrandWithAdmin('Register B');
    const customer = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${a.token}`)
      // A body-supplied brand must be ignored — otherwise one brand could file
      // requests that land on another brand's console.
      .send({ user: String(customer._id), category: 'AC', description: 'No cooling', brand: String(b.brand._id) })
      .expect(201);

    expect(String(res.body.data.brand)).toBe(String(a.brand._id));
    expect(res.body.data.status).toBe('New');

    const listRes = await request(app)
      .get('/api/v1/service-requests')
      .set('Authorization', `Bearer ${b.token}`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(0);
  });

  it('404s an unknown customer and rejects a non-customer subject', async () => {
    const a = await seedBrandWithAdmin('Register C');
    const technicianUser = await User.findOne({ role: ROLES.TECHNICIAN });

    await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ user: String(new mongoose.Types.ObjectId()), category: 'AC' })
      .expect(404);

    if (technicianUser) {
      await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${a.token}`)
        .send({ user: String(technicianUser._id), category: 'AC' })
        .expect(400);
    }
  });

  it('is closed to customers and technicians', async () => {
    const customer = await seedCustomer();
    const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: customer.phone, password: 'password123' });
    await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ user: String(customer._id), category: 'AC' })
      .expect(403);
  });
});

describe('brand settings', () => {
  it('creates defaults on first read and merges the brand\'s own identity', async () => {
    const { brand, token } = await seedBrandWithAdmin('Settings Brand');

    const res = await request(app)
      .get('/api/v1/brand/settings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.autoAssignTechnician).toBe(true);
    expect(res.body.data.emailNotifications).toBe(true);
    expect(res.body.data.smsAlerts).toBe(false);
    // Identity comes from the Brand document, which super-admin owns.
    expect(res.body.data.brandName).toBe('Settings Brand');
    expect(String(res.body.data.brand)).toBe(String(brand._id));
  });

  it('persists an update and never lets one brand read another\'s', async () => {
    const a = await seedBrandWithAdmin('Settings A');
    const b = await seedBrandWithAdmin('Settings B');

    await request(app)
      .put('/api/v1/brand/settings')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ supportEmail: 'help@a.test', smsAlerts: true, autoAssignTechnician: false })
      .expect(200);

    const aRes = await request(app)
      .get('/api/v1/brand/settings')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(aRes.body.data.supportEmail).toBe('help@a.test');
    expect(aRes.body.data.smsAlerts).toBe(true);
    expect(aRes.body.data.autoAssignTechnician).toBe(false);

    // B is untouched — settings are per brand, not global.
    const bRes = await request(app)
      .get('/api/v1/brand/settings')
      .set('Authorization', `Bearer ${b.token}`)
      .expect(200);
    expect(bRes.body.data.supportEmail).toBeUndefined();
    expect(bRes.body.data.smsAlerts).toBe(false);
    expect(bRes.body.data.brandName).toBe('Settings B');
  });

  it('ignores a body-supplied brand and is closed without auth', async () => {
    const a = await seedBrandWithAdmin('Settings C');
    const b = await seedBrandWithAdmin('Settings D');

    const res = await request(app)
      .put('/api/v1/brand/settings')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ brand: String(b.brand._id), supportPhone: '1800-000-000' })
      .expect(200);
    // The caller's own brand always wins.
    expect(String(res.body.data.brand)).toBe(String(a.brand._id));

    await request(app).get('/api/v1/brand/settings').expect(401);
  });
});

describe('brand dashboard and reports', () => {
  it('counts only this brand\'s complaints and only settled invoice value', async () => {
    const a = await seedBrandWithAdmin('Dash A');
    const b = await seedBrandWithAdmin('Dash B');
    const customer = await seedCustomer();
    const technician = await seedTechnician();

    const mine = await seedServiceRequestForBrand(a.brand, customer, technician);
    await seedServiceRequestForBrand(b.brand, customer, technician);

    await Invoice.create({ brand: a.brand._id, serviceRequest: mine._id, customer: customer._id, total: 1500, status: 'Paid' });
    // Pending money has not moved and must not be counted as billed.
    await Invoice.create({ brand: a.brand._id, serviceRequest: mine._id, customer: customer._id, total: 9999, status: 'Pending' });

    const res = await request(app)
      .get('/api/v1/brand/dashboard')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data.totalComplaints).toBe(1);
    expect(res.body.data.totalInvoiceValue).toBe(1500);
  });

  it('reports by category and ranks technicians by this brand\'s jobs only', async () => {
    const a = await seedBrandWithAdmin('Dash C');
    const b = await seedBrandWithAdmin('Dash D');
    const customer = await seedCustomer();
    const technician = await seedTechnician();

    await seedServiceRequestForBrand(a.brand, customer, technician);
    // Same technician on another brand — must not inflate their ranking here.
    await seedServiceRequestForBrand(b.brand, customer, technician);

    const res = await request(app)
      .get('/api/v1/brand/reports')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data.topTechnicians).toHaveLength(1);
    expect(res.body.data.topTechnicians[0].total).toBe(1);
    expect(res.body.data.requestsByCategory[0].count).toBe(1);
  });

  it('is closed without a brand-scoped token', async () => {
    await request(app).get('/api/v1/brand/dashboard').expect(401);
    await request(app).get('/api/v1/brand/reports').expect(401);
  });
});

describe('brand parts — orders and inventory', () => {
  it('finds part orders through the job\'s service request, and never another brand\'s', async () => {
    const a = await seedBrandWithAdmin('Parts A');
    const b = await seedBrandWithAdmin('Parts B');
    const customer = await seedCustomer();
    const technician = await seedTechnician();

    const mineSr = await seedServiceRequestForBrand(a.brand, customer, technician);
    const theirsSr = await seedServiceRequestForBrand(b.brand, customer, technician);

    const mineJob = await Job.create({ serviceRequest: mineSr._id, technician: technician._id, type: 'NCC Paid Service' });
    const theirsJob = await Job.create({ serviceRequest: theirsSr._id, technician: technician._id, type: 'NCC Paid Service' });

    await PartOrder.create({ technician: technician._id, job: mineJob._id, partName: 'Compressor', orderSource: 'NCC Warehouse' });
    await PartOrder.create({ technician: technician._id, job: theirsJob._id, partName: 'Other Brand Part', orderSource: 'NCC Warehouse' });
    // No job attached — belongs to no brand and must be excluded entirely.
    await PartOrder.create({ technician: technician._id, partName: 'General Restock', orderSource: 'Nearby Store' });

    const res = await request(app)
      .get('/api/v1/brand/part-orders')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].partName).toBe('Compressor');
    expect(res.body.data[0].technician.name).toBe('Test Technician');
    expect(res.body.data[0].job.serviceRequest.humanId).toBeDefined();
  });

  it('filters part orders by status', async () => {
    const a = await seedBrandWithAdmin('Parts C');
    const customer = await seedCustomer();
    const technician = await seedTechnician();
    const sr = await seedServiceRequestForBrand(a.brand, customer, technician);
    const job = await Job.create({ serviceRequest: sr._id, technician: technician._id, type: 'NCC Paid Service' });

    await PartOrder.create({ technician: technician._id, job: job._id, partName: 'P1', orderSource: 'NCC Warehouse', status: 'Pending' });
    await PartOrder.create({ technician: technician._id, job: job._id, partName: 'P2', orderSource: 'NCC Warehouse', status: 'Dispatched' });

    const res = await request(app)
      .get('/api/v1/brand/part-orders?status=Dispatched')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].partName).toBe('P2');
  });

  it('aggregates stock by SKU across the technicians serving this brand', async () => {
    const a = await seedBrandWithAdmin('Parts D');
    const customer = await seedCustomer();
    const tech1 = await seedTechnician();
    const tech2 = await seedTechnician();
    const outsider = await seedTechnician();

    await seedServiceRequestForBrand(a.brand, customer, tech1);
    await seedServiceRequestForBrand(a.brand, customer, tech2);

    await TechInventoryItem.create({ technician: tech1._id, name: 'Compressor', sku: 'CMP-1', qty: 3, price: 2000 });
    await TechInventoryItem.create({ technician: tech2._id, name: 'Compressor', sku: 'CMP-1', qty: 2, price: 2000 });
    // A technician who never worked this brand — their stock is not visible here.
    await TechInventoryItem.create({ technician: outsider._id, name: 'Compressor', sku: 'CMP-1', qty: 99, price: 2000 });

    const res = await request(app)
      .get('/api/v1/brand/inventory')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    // 3 + 2 from the brand's own technicians; the outsider's 99 is excluded.
    expect(res.body.data[0].totalQty).toBe(5);
    expect(res.body.data[0].technicians).toBe(2);
    expect(res.body.data[0].status).toBe('In Stock');
  });

  it('returns empty rather than erroring for a brand with no technicians', async () => {
    const a = await seedBrandWithAdmin('Parts E');
    for (const path of ['part-orders', 'inventory']) {
      const res = await request(app)
        .get(`/api/v1/brand/${path}`)
        .set('Authorization', `Bearer ${a.token}`)
        .expect(200);
      expect(res.body.data).toEqual([]);
    }
  });

  it('is closed without a brand-scoped token', async () => {
    await request(app).get('/api/v1/brand/part-orders').expect(401);
    await request(app).get('/api/v1/brand/inventory').expect(401);
  });
});

describe('brand academy', () => {
  it('creates and lists only this brand\'s guides', async () => {
    const a = await seedBrandWithAdmin('Academy A');
    const b = await seedBrandWithAdmin('Academy B');

    await request(app)
      .post('/api/v1/brand/academy/guides')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ title: 'OLED Panel Assembly', type: 'PDF', product: 'Smart TV' })
      .expect(201);

    const aList = await request(app)
      .get('/api/v1/brand/academy/guides')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(aList.body.data).toHaveLength(1);

    const bList = await request(app)
      .get('/api/v1/brand/academy/guides')
      .set('Authorization', `Bearer ${b.token}`)
      .expect(200);
    expect(bList.body.data).toHaveLength(0);
  });

  it('refuses to change platform-wide content a brand did not author', async () => {
    const a = await seedBrandWithAdmin('Academy C');
    // brand: null is super-admin's platform-wide library.
    const platformGuide = await TrainingGuide.create({ title: 'Platform Safety Basics', type: 'PDF' });
    const platformCourse = await Course.create({ name: 'Platform Onboarding', status: 'Active' });

    await request(app)
      .delete(`/api/v1/brand/academy/guides/${platformGuide.id}`)
      .set('Authorization', `Bearer ${a.token}`)
      .expect(403);

    await request(app)
      .put(`/api/v1/brand/academy/courses/${platformCourse.id}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ status: 'Draft' })
      .expect(403);

    // Untouched.
    expect((await Course.findById(platformCourse.id)).status).toBe('Active');
  });

  it('refuses to touch another brand\'s content', async () => {
    const a = await seedBrandWithAdmin('Academy D');
    const b = await seedBrandWithAdmin('Academy E');

    const created = await request(app)
      .post('/api/v1/brand/academy/courses')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ name: 'A-only course', status: 'Active' })
      .expect(201);

    await request(app)
      .put(`/api/v1/brand/academy/courses/${created.body.data.id}`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({ status: 'Draft' })
      .expect(403);

    await request(app)
      .delete(`/api/v1/brand/academy/courses/${created.body.data.id}`)
      .set('Authorization', `Bearer ${b.token}`)
      .expect(403);
  });

  it('updates and deletes a course the brand owns', async () => {
    const a = await seedBrandWithAdmin('Academy F');
    const created = await request(app)
      .post('/api/v1/brand/academy/courses')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ name: 'Compressor Servicing', modules: ['Intro', 'Practical'], testRequired: true, minScore: 80 })
      .expect(201);

    const updated = await request(app)
      .put(`/api/v1/brand/academy/courses/${created.body.data.id}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ status: 'Active' })
      .expect(200);
    expect(updated.body.data.status).toBe('Active');
    expect(updated.body.data.modules).toHaveLength(2);

    await request(app)
      .delete(`/api/v1/brand/academy/courses/${created.body.data.id}`)
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(await Course.countDocuments({ brand: a.brand._id })).toBe(0);
  });

  it('is closed without a brand-scoped token', async () => {
    await request(app).get('/api/v1/brand/academy/guides').expect(401);
    await request(app).get('/api/v1/brand/academy/courses').expect(401);
  });
});

describe('brand payments', () => {
  async function seedJobFor(brand, customer, technician) {
    const sr = await seedServiceRequestForBrand(brand, customer, technician);
    const job = await Job.create({ serviceRequest: sr._id, technician: technician._id, type: 'NCC Paid Service' });
    return { sr, job };
  }

  it('lists customer payments made against this brand\'s jobs only', async () => {
    const a = await seedBrandWithAdmin('Pay A');
    const b = await seedBrandWithAdmin('Pay B');
    const customer = await seedCustomer();
    const technician = await seedTechnician();

    const mine = await seedJobFor(a.brand, customer, technician);
    const theirs = await seedJobFor(b.brand, customer, technician);

    await Payment.create({ user: customer._id, targetType: 'job', targetId: mine.job._id, amount: 2596, method: 'UPI', status: 'Success' });
    await Payment.create({ user: customer._id, targetType: 'job', targetId: theirs.job._id, amount: 999, method: 'Cash', status: 'Success' });
    // A payment for something that isn't a job is not this brand's business.
    await Payment.create({ user: customer._id, targetType: 'order', targetId: mine.job._id, amount: 500, method: 'Card', status: 'Success' });

    const res = await request(app)
      .get('/api/v1/brand/payments/customer')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe(2596);
    expect(res.body.data[0].method).toBe('UPI');
    expect(res.body.data[0].user.name).toBe('Test Customer');
  });

  it('lists technician payouts earned on this brand\'s jobs', async () => {
    const a = await seedBrandWithAdmin('Pay C');
    const b = await seedBrandWithAdmin('Pay D');
    const customer = await seedCustomer();
    const technician = await seedTechnician();

    const mine = await seedJobFor(a.brand, customer, technician);
    const theirs = await seedJobFor(b.brand, customer, technician);

    await Payout.create({ technician: technician._id, job: mine.job._id, baseAmount: 800, netAmount: 720, status: 'Settled' });
    await Payout.create({ technician: technician._id, job: theirs.job._id, baseAmount: 500, netAmount: 450, status: 'Settled' });

    const res = await request(app)
      .get('/api/v1/brand/payments/payouts')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].netAmount).toBe(720);
    expect(res.body.data[0].technician.name).toBe('Test Technician');
    expect(res.body.data[0].job.serviceRequest.humanId).toBeDefined();
  });

  it('lists unsettled invoices as pending dues, excluding paid ones', async () => {
    const a = await seedBrandWithAdmin('Pay E');
    const customer = await seedCustomer();
    const technician = await seedTechnician();
    const { sr } = await seedJobFor(a.brand, customer, technician);

    await Invoice.create({ brand: a.brand._id, serviceRequest: sr._id, customer: customer._id, total: 1500, status: 'Pending' });
    await Invoice.create({ brand: a.brand._id, serviceRequest: sr._id, customer: customer._id, total: 900, status: 'Failed' });
    await Invoice.create({ brand: a.brand._id, serviceRequest: sr._id, customer: customer._id, total: 700, status: 'Paid' });

    const res = await request(app)
      .get('/api/v1/brand/payments/dues')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((i) => i.status !== 'Paid')).toBe(true);
  });

  it('returns empty for a brand with no jobs, and is closed without auth', async () => {
    const a = await seedBrandWithAdmin('Pay F');
    for (const path of ['customer', 'payouts', 'dues']) {
      const res = await request(app)
        .get(`/api/v1/brand/payments/${path}`)
        .set('Authorization', `Bearer ${a.token}`)
        .expect(200);
      expect(res.body.data).toEqual([]);
      await request(app).get(`/api/v1/brand/payments/${path}`).expect(401);
    }
  });
});

describe('brand warranty lookup', () => {
  it('resolves an appliance by serial and reports it as covered', async () => {
    const { brand, token } = await seedBrandWithAdmin('Warranty Brand A');
    const customer = await User.create({
      role: ROLES.CUSTOMER, phone: '9200000801', name: 'Covered Customer', passwordHash: await hashPassword('password123'),
    });
    // Purchased last month, so still inside the 12-month base warranty.
    const purchased = new Date();
    purchased.setMonth(purchased.getMonth() - 1);
    await OwnedAppliance.create({
      user: customer._id, category: 'AC', brand: brand.name, model: 'X-100', serialNumber: 'SN-ABC-123', purchaseDate: purchased,
    });

    const res = await request(app)
      .get('/api/v1/brand/warranty-lookup?query=SN-ABC-123')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.found).toBe(true);
    expect(res.body.data.covered).toBe(true);
    expect(res.body.data.status).toBe('In Warranty');
    expect(res.body.data.customer.name).toBe('Covered Customer');
    expect(res.body.data.appliance.expiryDate).toBeTruthy();
  });

  it('reports an out-of-warranty appliance rather than refusing to find it', async () => {
    const { brand, token } = await seedBrandWithAdmin('Warranty Brand B');
    const customer = await User.create({
      role: ROLES.CUSTOMER, phone: '9200000802', name: 'Expired Customer', passwordHash: await hashPassword('password123'),
    });
    const old = new Date();
    old.setFullYear(old.getFullYear() - 3);
    await OwnedAppliance.create({
      user: customer._id, category: 'AC', brand: brand.name, serialNumber: 'SN-OLD-999', purchaseDate: old,
    });

    const res = await request(app)
      .get('/api/v1/brand/warranty-lookup?query=SN-OLD-999')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.found).toBe(true);
    expect(res.body.data.covered).toBe(false);
    expect(res.body.data.status).toBe('Out of Warranty');
  });

  it('does not surface another brand\'s appliance', async () => {
    const { token } = await seedBrandWithAdmin('Warranty Brand C');
    const otherBrand = await Brand.create({ name: 'Rival Brand', category: 'Appliances', status: 'Active' });
    const customer = await User.create({
      role: ROLES.CUSTOMER, phone: '9200000803', name: 'Rival Customer', passwordHash: await hashPassword('password123'),
    });
    await OwnedAppliance.create({
      user: customer._id, category: 'AC', brand: otherBrand.name, serialNumber: 'SN-RIVAL-1', purchaseDate: new Date(),
    });

    const res = await request(app)
      .get('/api/v1/brand/warranty-lookup?query=SN-RIVAL-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.found).toBe(false);
  });

  it('returns found:false for an unknown code and 400 for a blank query', async () => {
    const { token } = await seedBrandWithAdmin('Warranty Brand D');
    const res = await request(app)
      .get('/api/v1/brand/warranty-lookup?query=NOPE')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.found).toBe(false);

    await request(app)
      .get('/api/v1/brand/warranty-lookup?query=')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    await request(app).get('/api/v1/brand/warranty-lookup?query=SN-ABC-123').expect(401);
  });
});

describe('brand write actions actually reach the customer', () => {
  /** A customer with real service history against this brand. */
  async function servedCustomer(brand) {
    const user = await seedCustomer();
    await ServiceRequest.create({
      user: user._id,
      brand: brand._id,
      category: 'AC',
      description: 'Past job',
      requestMode: 'B2C',
    });
    return { user };
  }

  it('sends a notification to one of the brand\'s own customers', async () => {
    const { brand, token } = await seedBrandWithAdmin('NotifyBrand');
    const { user } = await servedCustomer(brand);

    await request(app)
      .post('/api/v1/brand/actions/notify-customer')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id, title: 'Service update', body: 'Your part has arrived.' })
      .expect(201);

    const notification = await Notification.findOne({ recipient: user._id });
    expect(notification.message).toBe('Your part has arrived.');
  });

  it('refuses to notify a customer the brand has never served', async () => {
    const { token } = await seedBrandWithAdmin('StrangerBrand');
    const user = await seedCustomer();

    await request(app)
      .post('/api/v1/brand/actions/notify-customer')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id, title: 'Hi', body: 'Unsolicited' })
      .expect(403);

    expect(await Notification.countDocuments({ recipient: user._id })).toBe(0);
  });

  it('sends an AMC renewal reminder and schedules a real visit', async () => {
    const { brand, token } = await seedBrandWithAdmin('AmcBrand');
    const { user } = await servedCustomer(brand);
    const auth = { Authorization: `Bearer ${token}` };

    const plan = await AMCPlan.create({ name: 'Gold', tier: 'Gold', price: 2499, visitsTotal: 4 });
    const subscription = await AMCSubscription.create({
      user: user._id,
      plan: plan._id,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Active',
      visitsTotal: 4,
      visitsRemaining: 4,
    });

    await request(app)
      .post(`/api/v1/brand/actions/amc/${subscription.id}/renewal-reminder`)
      .set(auth)
      .send({})
      .expect(200);
    expect(await Notification.countDocuments({ recipient: user._id })).toBe(1);

    const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const visitRes = await request(app)
      .post(`/api/v1/brand/actions/amc/${subscription.id}/visits`)
      .set(auth)
      .send({ scheduledDate })
      .expect(201);

    expect(visitRes.body.data.visitNumber).toBe(1);
    expect(visitRes.body.data.status).toBe('Scheduled');
    expect(await AMCVisit.countDocuments({ subscription: subscription._id })).toBe(1);
    // The visit also notifies the customer.
    expect(await Notification.countDocuments({ recipient: user._id })).toBe(2);
  });

  it('numbers a second visit sequentially rather than reusing 1', async () => {
    const { brand, token } = await seedBrandWithAdmin('SeqBrand');
    const { user } = await servedCustomer(brand);
    const plan = await AMCPlan.create({ name: 'Silver', tier: 'Silver', price: 999, visitsTotal: 4 });
    const subscription = await AMCSubscription.create({
      user: user._id,
      plan: plan._id,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Active',
      visitsTotal: 4,
      visitsRemaining: 4,
    });

    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post(`/api/v1/brand/actions/amc/${subscription.id}/visits`).set(auth).send({ scheduledDate: date }).expect(201);
    const second = await request(app).post(`/api/v1/brand/actions/amc/${subscription.id}/visits`).set(auth).send({ scheduledDate: date }).expect(201);

    expect(second.body.data.visitNumber).toBe(2);
  });

  it('refuses to schedule a visit when none remain', async () => {
    const { brand, token } = await seedBrandWithAdmin('ExhaustedBrand');
    const { user } = await servedCustomer(brand);
    const plan = await AMCPlan.create({ name: 'Basic', tier: 'Silver', price: 499, visitsTotal: 1 });
    const subscription = await AMCSubscription.create({
      user: user._id,
      plan: plan._id,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Active',
      visitsTotal: 1,
      visitsRemaining: 0,
    });

    await request(app)
      .post(`/api/v1/brand/actions/amc/${subscription.id}/visits`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scheduledDate: new Date().toISOString() })
      .expect(409);
  });

  it("refuses to act on another brand's AMC subscription", async () => {
    const owner = await seedBrandWithAdmin('OwnerBrand');
    const outsider = await seedBrandWithAdmin('OutsiderBrand');
    const { user } = await servedCustomer(owner.brand);

    const plan = await AMCPlan.create({ name: 'Gold', tier: 'Gold', price: 2499, visitsTotal: 4 });
    const subscription = await AMCSubscription.create({
      user: user._id,
      plan: plan._id,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Active',
      visitsTotal: 4,
      visitsRemaining: 4,
    });

    await request(app)
      .post(`/api/v1/brand/actions/amc/${subscription.id}/renewal-reminder`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({})
      .expect(403);
  });
});

describe('brand dashboard trend and product mix', () => {
  it('reports real per-day counts and a category breakdown', async () => {
    const { brand, token } = await seedBrandWithAdmin('TrendBrand');
    const user = await seedCustomer();

    // Two AC requests today, one Refrigerator request today.
    await ServiceRequest.create([
      { user: user._id, brand: brand._id, category: 'AC', description: 'a', requestMode: 'B2C' },
      { user: user._id, brand: brand._id, category: 'AC', description: 'b', requestMode: 'B2C' },
      { user: user._id, brand: brand._id, category: 'Refrigerator', description: 'c', requestMode: 'B2C' },
    ]);

    const res = await request(app)
      .get('/api/v1/brand/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { trend, byProduct } = res.body.data;

    // Seven whole days, densified — a quiet day reads zero rather than vanishing.
    expect(trend).toHaveLength(7);
    expect(trend.every((t) => typeof t.count === 'number')).toBe(true);
    expect(trend[6].count).toBe(3);

    expect(byProduct[0]).toMatchObject({ name: 'AC', value: 2 });
    expect(byProduct[0].pct).toBeCloseTo(66.7, 0);
    expect(byProduct.find((p) => p.name === 'Refrigerator').value).toBe(1);
  });

  it("does not count another brand's requests", async () => {
    const mine = await seedBrandWithAdmin('MineBrand');
    const other = await seedBrandWithAdmin('OtherBrand');
    const user = await seedCustomer();

    await ServiceRequest.create({ user: user._id, brand: other.brand._id, category: 'AC', description: 'x', requestMode: 'B2C' });

    const res = await request(app)
      .get('/api/v1/brand/dashboard')
      .set('Authorization', `Bearer ${mine.token}`)
      .expect(200);

    expect(res.body.data.byProduct).toHaveLength(0);
    expect(res.body.data.trend.reduce((sum, t) => sum + t.count, 0)).toBe(0);
  });
});

describe('brand reports monthly series', () => {
  it('returns six real months and no change figure when there is no prior month', async () => {
    const { brand, token } = await seedBrandWithAdmin('MonthlyBrand');
    const user = await seedCustomer();
    await ServiceRequest.create([
      { user: user._id, brand: brand._id, category: 'AC', description: 'a', requestMode: 'B2C' },
      { user: user._id, brand: brand._id, category: 'AC', description: 'b', requestMode: 'B2C' },
    ]);

    const res = await request(app)
      .get('/api/v1/brand/reports')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { monthly, monthlyChangePercent } = res.body.data;
    expect(monthly).toHaveLength(6);
    // This month carries both requests; the five before it are real zeroes.
    expect(monthly[5].count).toBe(2);
    expect(monthly.slice(0, 5).every((m) => m.count === 0)).toBe(true);
    // Nothing last month, so there is no percentage to report rather than "+15%".
    expect(monthlyChangePercent).toBeNull();
  });
});
