import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { ROLES } from '../src/config/constants.js';
import { User } from '../src/modules/auth/user.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { WarrantyGroup } from '../src/modules/partner-warranty/warrantyGroup.model.js';
import { WarrantyIssue } from '../src/modules/partner-warranty/warrantyIssue.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { resolveSelection } from '../src/modules/partner-warranty/warrantyCatalog.service.js';
import { seedPartnerWarranty, WARRANTY_GROUP_SEED } from '../scripts/seedPartnerWarranty.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { jobFlow } from './helpers/jobFlow.js';

const TEST_DB_URI = testDbUri('partnerWarrantyCatalog');

let app;
const flow = jobFlow(() => app, { phoneStart: 9310200000 });
const api = () => request(app);
let emailSeq = 0;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
  await registerAllModels();
  await ensureIndexes();
  app = await listenOnLoopback(createApp());
});

afterAll(async () => {
  await closeServer(app);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([Category, ProductType, Brand, WarrantyGroup, WarrantyIssue, User].map((m) => m.deleteMany({})));
});

async function tokenFor(role, extra = {}) {
  const email = `pw-cat-${emailSeq++}@test.local`;
  await User.create({ role, name: `${role} user`, email, passwordHash: await hashPassword('password123'), ...extra });
  return flow.loginAndVerify({ role, identifier: email });
}
const bearer = (t) => ({ Authorization: `Bearer ${t}` });

/** AC + Refrigerator + an inactive Chimney, one AirCare group, LG (listed), Voltas (listed), Samsung (not enabled), Pending Co. */
async function world() {
  const [ac, fridge, chimney] = await Category.create([
    { key: 'AC', name: 'Air Conditioner', imageUrl: 'https://res.cloudinary.com/x/ac.png' },
    { key: 'Refrigerator', name: 'Refrigerator' },
    { key: 'Chimney', name: 'Chimney', isActive: false },
  ]);
  const [aircare, electro] = await WarrantyGroup.create([
    { name: 'AirCare', slug: 'aircare', categories: [ac._id], sortOrder: 1 },
    { name: 'ElectroCare', slug: 'electrocare', categories: [fridge._id, chimney._id], sortOrder: 0 },
  ]);
  const [lg, voltas, samsung, pending] = await Brand.create([
    { name: 'LG', status: 'Active', warrantyEnabled: true, coverage: [ac._id, fridge._id, chimney._id], logoUrl: 'https://res.cloudinary.com/x/lg.png' },
    { name: 'Voltas', status: 'Active', warrantyEnabled: true, coverage: [ac._id] },
    { name: 'Samsung', status: 'Active', warrantyEnabled: false, coverage: [ac._id, fridge._id] },
    { name: 'Pending Co', status: 'Pending', warrantyEnabled: true, coverage: [ac._id] },
  ]);
  return { ac, fridge, chimney, aircare, electro, lg, voltas, samsung, pending };
}

describe('Phase 2 — seed', () => {
  it('creates the seven groups, links only existing categories, and adds issues', async () => {
    await Category.create([{ key: 'AC', name: 'AC' }, { key: 'Refrigerator', name: 'Refrigerator' }]);
    const result = await seedPartnerWarranty();

    expect(result.groupsInserted).toBe(WARRANTY_GROUP_SEED.length);
    const aircare = await WarrantyGroup.findOne({ slug: 'aircare' }).populate('categories');
    expect(aircare.categories.map((c) => c.key)).toEqual(['AC']);
    expect(result.missingCategories).toContain('Air Cooler');
    expect(await WarrantyIssue.countDocuments({ productType: null })).toBe(6 + 5); // AC + Refrigerator lists
  });

  it('is idempotent and never overwrites an admin edit', async () => {
    await Category.create({ key: 'AC', name: 'AC' });
    await seedPartnerWarranty();
    await WarrantyGroup.updateOne({ slug: 'aircare' }, { tagline: 'Edited by admin' });

    const second = await seedPartnerWarranty();
    expect(second).toMatchObject({ groupsInserted: 0, issuesInserted: 0 });
    expect((await WarrantyGroup.findOne({ slug: 'aircare' })).tagline).toBe('Edited by admin');
  });
});

describe('Phase 2 — public catalogue', () => {
  it('lists active groups in order with how many brands serve each', async () => {
    const w = await world();
    await WarrantyGroup.create({ name: 'Hidden', slug: 'hidden', categories: [w.ac._id], isActive: false });

    const res = await api().get('/api/v1/partner-warranty/groups').expect(200);
    expect(res.body.data.map((g) => g.slug)).toEqual(['electrocare', 'aircare']);
    // ElectroCare: only LG (Samsung not enabled; Chimney is inactive so it doesn't count)
    expect(res.body.data.find((g) => g.slug === 'electrocare').brandCount).toBe(1);
    expect(res.body.data.find((g) => g.slug === 'aircare').brandCount).toBe(2);
  });

  it('lists only active, warranty-enabled brands, by group (slug or id) and by name search', async () => {
    const w = await world();
    const all = await api().get('/api/v1/partner-warranty/brands').expect(200);
    expect(all.body.data.map((b) => b.name)).toEqual(['LG', 'Voltas']);
    expect(all.body.data[0]).toEqual({ id: String(w.lg._id), name: 'LG', logoUrl: 'https://res.cloudinary.com/x/lg.png' });

    const electro = await api().get('/api/v1/partner-warranty/brands?group=electrocare').expect(200);
    expect(electro.body.data.map((b) => b.name)).toEqual(['LG']);

    const byId = await api().get(`/api/v1/partner-warranty/brands?group=${w.aircare._id}`).expect(200);
    expect(byId.body.data.map((b) => b.name)).toEqual(['LG', 'Voltas']);

    const search = await api().get('/api/v1/partner-warranty/brands?q=volt').expect(200);
    expect(search.body.data.map((b) => b.name)).toEqual(['Voltas']);

    // Regex characters are matched literally, not executed.
    await api().get('/api/v1/partner-warranty/brands?q=(').expect(200);
  });

  it('404s for an unknown or inactive group', async () => {
    await world();
    await api().get('/api/v1/partner-warranty/brands?group=nope').expect(404);
  });

  it('lists a brand\'s products (categories) — only covered, active, and inside the group', async () => {
    const w = await world();
    const all = await api().get(`/api/v1/partner-warranty/brands/${w.lg._id}/products`).expect(200);
    expect(all.body.data.brand.name).toBe('LG');
    expect(all.body.data.products.map((p) => p.key).sort()).toEqual(['AC', 'Refrigerator']); // Chimney inactive

    const air = await api().get(`/api/v1/partner-warranty/brands/${w.lg._id}/products?group=aircare`).expect(200);
    expect(air.body.data.products).toEqual([
      { id: String(w.ac._id), key: 'AC', name: 'Air Conditioner', imageUrl: 'https://res.cloudinary.com/x/ac.png', icon: null },
    ]);
  });

  it('hides products of brands that are not listed', async () => {
    const w = await world();
    await api().get(`/api/v1/partner-warranty/brands/${w.samsung._id}/products`).expect(404);
    await api().get(`/api/v1/partner-warranty/brands/${w.pending._id}/products`).expect(404);
    await api().get('/api/v1/partner-warranty/brands/not-an-id/products').expect(400);
  });

  it('lists issues for a product, letting a product type\'s own list win', async () => {
    const w = await world();
    const split = await ProductType.create({ category: w.ac._id, slug: 'split', name: 'Split AC' });
    await WarrantyIssue.create([
      { category: w.ac._id, name: 'Cooling Issue', sortOrder: 0 },
      { category: w.ac._id, name: 'Water Leakage', sortOrder: 1 },
      { category: w.ac._id, name: 'Retired', isActive: false },
      { category: w.ac._id, productType: split._id, name: 'Indoor Unit Noise' },
    ]);

    const base = await api().get(`/api/v1/partner-warranty/products/${w.ac._id}/issues`).expect(200);
    expect(base.body.data.product.key).toBe('AC');
    expect(base.body.data.issues.map((i) => i.name)).toEqual(['Cooling Issue', 'Water Leakage']);

    const typed = await api().get(`/api/v1/partner-warranty/products/${w.ac._id}/issues?productType=${split._id}`).expect(200);
    expect(typed.body.data.issues.map((i) => i.name)).toEqual(['Indoor Unit Noise']);

    const window = await ProductType.create({ category: w.ac._id, slug: 'window', name: 'Window AC' });
    const fallback = await api().get(`/api/v1/partner-warranty/products/${w.ac._id}/issues?productType=${window._id}`).expect(200);
    expect(fallback.body.data.issues.map((i) => i.name)).toEqual(['Cooling Issue', 'Water Leakage']);

    await api().get(`/api/v1/partner-warranty/products/${w.chimney._id}/issues`).expect(404);
  });
});

describe('Phase 2 — resolveSelection (used by claim submission)', () => {
  it('accepts a consistent pick and rejects inconsistent ones', async () => {
    const w = await world();
    const [cooling, fridgeNoise] = await WarrantyIssue.create([
      { category: w.ac._id, name: 'Cooling Issue' },
      { category: w.fridge._id, name: 'Noise' },
    ]);

    const ok = await resolveSelection({ brandId: String(w.lg._id), categoryId: String(w.ac._id), issueId: String(cooling._id) });
    expect(ok.brand.name).toBe('LG');
    expect(ok.issue.name).toBe('Cooling Issue');

    await expect(
      resolveSelection({ brandId: String(w.voltas._id), categoryId: String(w.fridge._id), issueId: String(fridgeNoise._id) }),
    ).rejects.toThrow('Voltas does not accept warranty claims for Refrigerator');
    await expect(
      resolveSelection({ brandId: String(w.lg._id), categoryId: String(w.ac._id), issueId: String(fridgeNoise._id) }),
    ).rejects.toThrow('That issue does not belong to this product');
    await expect(
      resolveSelection({ brandId: String(w.samsung._id), categoryId: String(w.ac._id), issueId: String(cooling._id) }),
    ).rejects.toThrow('Brand not found');
  });
});

describe('Phase 2 — Super Admin catalogue management', () => {
  it('creates, updates and lists groups; rejects unknown categories and duplicate slugs', async () => {
    const w = await world();
    const token = await tokenFor(ROLES.SUPER_ADMIN);

    const made = await api()
      .post('/api/v1/super-admin/warranty-catalog/groups')
      .set(bearer(token))
      .send({ name: 'WaterCare', slug: 'watercare', tagline: 'Purifiers', categories: [String(w.fridge._id)] })
      .expect(201);
    expect(made.body.data.categories.map((c) => c.key)).toEqual(['Refrigerator']);

    await api()
      .post('/api/v1/super-admin/warranty-catalog/groups')
      .set(bearer(token))
      .send({ name: 'Again', slug: 'watercare' })
      .expect(409);
    await api()
      .post('/api/v1/super-admin/warranty-catalog/groups')
      .set(bearer(token))
      .send({ name: 'Bad', slug: 'bad', categories: [String(new mongoose.Types.ObjectId())] })
      .expect(400);

    const updated = await api()
      .put(`/api/v1/super-admin/warranty-catalog/groups/${made.body.data.id}`)
      .set(bearer(token))
      .send({ isActive: false })
      .expect(200);
    expect(updated.body.data.isActive).toBe(false);

    const list = await api().get('/api/v1/super-admin/warranty-catalog/groups').set(bearer(token)).expect(200);
    expect(list.body.data.map((g) => g.slug)).toContain('watercare'); // admins see inactive ones
    expect(await AuditLog.countDocuments({ type: 'Warranty' })).toBeGreaterThanOrEqual(2);
  });

  it('manages issues, refusing a product type from another category', async () => {
    const w = await world();
    const token = await tokenFor(ROLES.SUPER_ADMIN);
    const fridgeType = await ProductType.create({ category: w.fridge._id, slug: 'double', name: 'Double Door' });

    const issue = await api()
      .post('/api/v1/super-admin/warranty-catalog/issues')
      .set(bearer(token))
      .send({ category: String(w.ac._id), name: 'Cooling Issue' })
      .expect(201);
    await api()
      .post('/api/v1/super-admin/warranty-catalog/issues')
      .set(bearer(token))
      .send({ category: String(w.ac._id), productType: String(fridgeType._id), name: 'Wrong' })
      .expect(400);

    await api()
      .put(`/api/v1/super-admin/warranty-catalog/issues/${issue.body.data.id}`)
      .set(bearer(token))
      .send({ name: 'Not Cooling' })
      .expect(200);
    const listed = await api().get(`/api/v1/super-admin/warranty-catalog/issues?category=${w.ac._id}`).set(bearer(token)).expect(200);
    expect(listed.body.data.map((i) => i.name)).toEqual(['Not Cooling']);

    await api().delete(`/api/v1/super-admin/warranty-catalog/issues/${issue.body.data.id}`).set(bearer(token)).expect(200);
    expect(await WarrantyIssue.countDocuments()).toBe(0);
  });

  it('switches a brand on for warranty and sets its coverage, logo and SLA', async () => {
    const w = await world();
    const token = await tokenFor(ROLES.SUPER_ADMIN);

    const res = await api()
      .put(`/api/v1/super-admin/warranty-catalog/brands/${w.samsung._id}`)
      .set(bearer(token))
      .send({ warrantyEnabled: true, coverage: [String(w.ac._id)], warrantySla: { approvalHours: 12 } })
      .expect(200);
    expect(res.body.data).toMatchObject({ name: 'Samsung', warrantyEnabled: true, warrantySla: { approvalHours: 12 } });
    expect(res.body.data.coverage.map((c) => c.key)).toEqual(['AC']);

    const brands = await api().get('/api/v1/partner-warranty/brands?group=aircare').expect(200);
    expect(brands.body.data.map((b) => b.name)).toEqual(['LG', 'Samsung', 'Voltas']);
  });

  it('is closed to non-admins', async () => {
    await world();
    const customer = await tokenFor(ROLES.CUSTOMER);
    await api().get('/api/v1/super-admin/warranty-catalog/groups').set(bearer(customer)).expect(403);
    await api().get('/api/v1/super-admin/warranty-catalog/groups').expect(401);
  });
});

describe('Phase 2 — brand edits its own coverage', () => {
  it('reads its settings with the category options and updates coverage + logo', async () => {
    const w = await world();
    const token = await tokenFor(ROLES.BRAND_ADMIN, { brand: w.voltas._id });

    const got = await api().get('/api/v1/brand/warranty-coverage').set(bearer(token)).expect(200);
    expect(got.body.data.name).toBe('Voltas');
    expect(got.body.data.options.map((o) => o.key)).toEqual(['AC', 'Refrigerator']); // active only

    const put = await api()
      .put('/api/v1/brand/warranty-coverage')
      .set(bearer(token))
      .send({ coverage: [String(w.ac._id), String(w.fridge._id)], logoUrl: 'https://res.cloudinary.com/x/voltas.png' })
      .expect(200);
    expect(put.body.data.coverage.map((c) => c.key).sort()).toEqual(['AC', 'Refrigerator']);
    expect(put.body.data.logoUrl).toBe('https://res.cloudinary.com/x/voltas.png');
  });

  it('cannot switch itself on or change its SLA', async () => {
    const w = await world();
    const token = await tokenFor(ROLES.BRAND_ADMIN, { brand: w.samsung._id });
    await api().put('/api/v1/brand/warranty-coverage').set(bearer(token)).send({ warrantyEnabled: true }).expect(400);
    await api().put('/api/v1/brand/warranty-coverage').set(bearer(token)).send({ warrantySla: { approvalHours: 1 } }).expect(400);
    expect((await Brand.findById(w.samsung._id)).warrantyEnabled).toBe(false);
  });

  it('refuses base64 logos (upload first)', async () => {
    const w = await world();
    const token = await tokenFor(ROLES.BRAND_ADMIN, { brand: w.lg._id });
    await api().put('/api/v1/brand/warranty-coverage').set(bearer(token)).send({ logoUrl: 'data:image/png;base64,AAAA' }).expect(400);
  });
});
