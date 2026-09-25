import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { CatalogService } from '../src/modules/catalog/catalogService.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { CatalogueBrand } from '../src/modules/catalog/catalogueBrand.model.js';
import { createRateVersion } from '../src/modules/catalog/rateWriter.js';
import { bustCatalogueCache } from '../src/modules/catalog/catalogCache.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { detectWarrantyForAppliance } from '../src/modules/warranty-amc-exchange/warrantyDetector.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { CATALOGUE_BRAND_SEED } from '../scripts/catalogueBrandSeedData.js';
import { CATEGORY_SEED } from '../scripts/categorySeedData.js';
import { clearCatalogue } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// Catalogue brands (docs/master-catalogue Phase 19): the manufacturer a
// customer picks on a product-linked booking — separate from partner brands
// (brand-admin logins) — and the brand's own warranty length reaching the
// customer-side warranty checks.

const TEST_DB_URI = testDbUri('catalogue_brands');
let app;
let admin;
const flow = jobFlow(() => app, { phoneStart: 9301900000 });
const api = (method, path, body) =>
  request(app)[method](`/api/v1/super-admin/catalogue/brands${path}`).set('Authorization', `Bearer ${admin}`).send(body);

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
  await clearCatalogue();
  await Promise.all([User, Brand, CatalogueBrand, OwnedAppliance, AuditLog].map((m) => m.deleteMany({})));
  bustCatalogueCache();
  await Category.create([
    { key: 'AC', name: 'AC', sortOrder: 1 },
    { key: 'TV', name: 'TV', sortOrder: 2 },
    { key: 'Plumber', name: 'Plumber', sortOrder: 3 },
  ]);
  await User.create({ role: ROLES.SUPER_ADMIN, email: 'brands-admin@test.dev', name: 'Admin', passwordHash: await hashPassword('password123') });
  admin = await flow.loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: 'brands-admin@test.dev' });
});

async function bookable(categoryKey, { productLinked }) {
  const category = await Category.findOne({ key: categoryKey });
  const service = await CatalogService.create({ category: category._id, slug: 'repair', name: 'Repair' });
  const productType = productLinked ? await ProductType.create({ category: category._id, slug: 'split', name: 'Split' }) : null;
  const offering = await ServiceOffering.create({
    code: `${categoryKey}-REPAIR`,
    name: 'Repair',
    bookingType: productLinked ? 'PRODUCT_LINKED' : 'STANDALONE',
    category: category._id,
    service: service._id,
    productType: productType?._id ?? null,
    unitLabel: 'per unit',
  });
  await createRateVersion(offering._id, { customerPrice: 49900, spPayout: 20000, expressFee: 0, expressSpIncentive: 0 });
}

describe('admin catalogue brands', () => {
  it('creates, lists, edits, deletes and audits a brand', async () => {
    const created = await api('post', '', { name: 'Daikin', categories: ['AC'], warrantyMonths: 18 }).expect(201);
    expect(created.body.data).toMatchObject({ name: 'Daikin', categories: ['AC'], warrantyMonths: 18, isActive: true });

    const edited = await api('put', `/${created.body.data.id}`, { categories: ['AC', 'TV'], warrantyMonths: 24 }).expect(200);
    expect(edited.body.data).toMatchObject({ categories: ['AC', 'TV'], warrantyMonths: 24 });
    expect((await api('get', '').expect(200)).body.data.map((b) => b.name)).toEqual(['Daikin']);
    expect(await AuditLog.findOne({ action: 'Catalogue: updated brand Daikin' })).not.toBeNull();

    await api('delete', `/${created.body.data.id}`).expect(200);
    expect(await CatalogueBrand.countDocuments()).toBe(0);
  });

  it('refuses a duplicate name (any case), an unknown category and a silly warranty', async () => {
    await api('post', '', { name: 'LG', categories: ['AC'] }).expect(201);
    await api('post', '', { name: 'lg' }).expect(409);
    await api('post', '', { name: 'Sony', categories: ['Spaceship'] }).expect(400);
    await api('post', '', { name: 'Sony', warrantyMonths: 500 }).expect(400);
  });

  it('is super-admin only', async () => {
    const cust = await flow.customer();
    await request(app).get('/api/v1/super-admin/catalogue/brands').set('Authorization', `Bearer ${cust.token}`).expect(403);
  });

  it('never touches partner brands (brand-admin tenants)', async () => {
    await Brand.create({ name: 'Partner Co', category: 'Appliances', status: 'Active' });
    await api('post', '', { name: 'Partner Co', categories: ['AC'] }).expect(201);
    expect(await Brand.countDocuments()).toBe(1);
  });
});

describe('what the customer sees', () => {
  it('GET /catalog/brands lists active catalogue brands, narrowed by ?category=, and no partner brands', async () => {
    await CatalogueBrand.create([
      { name: 'Daikin', categories: ['AC'], sortOrder: 2 },
      { name: 'LG', categories: ['AC', 'TV'], sortOrder: 1 },
      { name: 'Retired', categories: ['AC'], isActive: false },
    ]);
    await Brand.create({ name: 'Partner Only', category: 'Appliances', status: 'Active' });

    const all = await request(app).get('/api/v1/catalog/brands').expect(200);
    expect(all.body.data.map((b) => b.name)).toEqual(['LG', 'Daikin']);
    const tv = await request(app).get('/api/v1/catalog/brands?category=TV').expect(200);
    expect(tv.body.data).toEqual([{ name: 'LG', categories: ['AC', 'TV'], warrantyMonths: 12 }]);
  });

  it('a product-linked category offers its brands on the booking tree; a standalone-only one offers none', async () => {
    await CatalogueBrand.create([
      { name: 'Daikin', categories: ['AC'] },
      { name: 'Jaquar', categories: ['Plumber'] },
    ]);
    await bookable('AC', { productLinked: true });
    await bookable('Plumber', { productLinked: false });

    const ac = await request(app).get('/api/v1/catalog/categories/AC/tree').expect(200);
    expect(ac.body.data.category.brands).toEqual(['Daikin']);
    const plumber = await request(app).get('/api/v1/catalog/categories/Plumber/tree').expect(200);
    expect(plumber.body.data.category.brands).toEqual([]);
  });

  it('a brand edit reaches the cached tree straight away', async () => {
    await bookable('AC', { productLinked: true });
    await request(app).get('/api/v1/catalog/categories/AC/tree').expect(200);
    await api('post', '', { name: 'Voltas', categories: ['AC'] }).expect(201);
    const ac = await request(app).get('/api/v1/catalog/categories/AC/tree').expect(200);
    expect(ac.body.data.category.brands).toEqual(['Voltas']);
  });
});

describe("the brand's own warranty length (was always 12 months)", () => {
  const monthsAgo = (n) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d;
  };

  it('booking detection: a 24-month catalogue brand is still in warranty at 18 months; a 12-month one is not', async () => {
    const cust = await flow.customer();
    await CatalogueBrand.create([
      { name: 'LongCover', categories: ['AC'], warrantyMonths: 24 },
      { name: 'ShortCover', categories: ['AC'], warrantyMonths: 12 },
    ]);
    const detect = (brandName) => detectWarrantyForAppliance({ userId: cust.user.id, category: 'AC', brandName, purchaseDate: monthsAgo(18) });
    expect((await detect('LongCover')).warrantyStatus).toBe('In Warranty');
    expect((await detect('longcover')).warrantyStatus).toBe('In Warranty');
    expect((await detect('ShortCover')).warrantyStatus).toBe('Out of Warranty');
    expect((await detect('Unknown Brand')).warrantyStatus).toBe('Out of Warranty');
  });

  it("a partner brand's own warranty months win over the catalogue brand's", async () => {
    const cust = await flow.customer();
    const partner = await Brand.create({ name: 'Acme', category: 'Appliances', status: 'Active', warrantyMonths: 36 });
    await CatalogueBrand.create({ name: 'Acme', categories: ['AC'], warrantyMonths: 12 });
    const res = await detectWarrantyForAppliance({ userId: cust.user.id, category: 'AC', brandName: 'Acme', purchaseDate: monthsAgo(30) });
    expect(res.warrantyStatus).toBe('In Warranty');
    expect(String(res.brandId)).toBe(partner.id);
  });

  it('a brand name with regex characters no longer breaks detection', async () => {
    const cust = await flow.customer();
    const res = await detectWarrantyForAppliance({ userId: cust.user.id, category: 'AC', brandName: 'A+ (Home', purchaseDate: monthsAgo(2) });
    expect(res.warrantyStatus).toBe('In Warranty');
  });

  it("My Appliances: status and expiry date follow the brand's months", async () => {
    const cust = await flow.customer();
    await CatalogueBrand.create({ name: 'LongCover', categories: ['AC'], warrantyMonths: 24 });
    const purchaseDate = monthsAgo(18);
    await OwnedAppliance.create({ user: cust.user._id, category: 'AC', brand: 'LongCover', purchaseDate });

    const res = await request(app).get('/api/v1/appliances').set('Authorization', `Bearer ${cust.token}`).expect(200);
    const [appliance] = res.body.data;
    expect(appliance.warrantyStatus).toBe('In Warranty');
    const expiry = new Date(purchaseDate);
    expiry.setMonth(expiry.getMonth() + 24);
    expect(new Date(appliance.warrantyExpiresOn).toDateString()).toBe(expiry.toDateString());
  });
});

describe('seed', () => {
  it('every seeded brand names seeded categories, once each', () => {
    const keys = new Set(CATEGORY_SEED.map((c) => c.key));
    const names = CATALOGUE_BRAND_SEED.map((b) => b.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const brand of CATALOGUE_BRAND_SEED) {
      expect(brand.categories.length).toBeGreaterThan(0);
      for (const key of brand.categories) expect(keys.has(key)).toBe(true);
    }
    expect(CATEGORY_SEED.some((c) => 'brands' in c)).toBe(false);
  });
});
