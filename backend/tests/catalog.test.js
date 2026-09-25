import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { clearCatalogue, seedSimpleOffering } from './helpers/catalogue.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('catalog');

let app;


async function loginAsAdmin() {
  await User.create({
    role: ROLES.SUPER_ADMIN,
    email: 'catalog-admin@test.dev',
    name: 'Admin',
    passwordHash: await hashPassword('password123'),
  });
  await request(app)
    .post('/api/v1/auth/login')
    .send({ role: ROLES.SUPER_ADMIN, identifier: 'catalog-admin@test.dev', password: 'password123' });
  const code = readOtpCode('catalog-admin@test.dev');
  const res = await request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ role: ROLES.SUPER_ADMIN, identifier: 'catalog-admin@test.dev', code });
  return res.body.data.accessToken;
}

// An AC category with one bookable Master Catalogue service (Repair) and one
// product type that has no offering yet (so it is not listed).
async function seedCategory() {
  const category = await Category.create({ key: 'AC', name: 'AC', color: '#0D47A1' });
  await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
  await seedSimpleOffering({ categoryKey: 'AC', code: 'AC-TEST-REPAIR', serviceName: 'Repair', price: 299 });
  return category;
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
    Category.deleteMany({}),
    ProductType.deleteMany({}),
  ]);
  await clearCatalogue();
});

describe('GET /catalog/categories', () => {
  it('lists each category with the services it can actually book — names only, never a price', async () => {
    await seedCategory();
    const res = await request(app).get('/api/v1/catalog/categories').expect(200);
    expect(res.body.data).toHaveLength(1);
    const [ac] = res.body.data;
    expect(ac.key).toBe('AC');
    // Split AC has no offering yet, so it isn't offered here.
    expect(ac.productTypes).toEqual([]);
    expect(ac.services).toEqual([{ id: 'repair', name: 'Repair' }]);
    expect(JSON.stringify(ac)).not.toMatch(/price/i);
  });

  it('excludes inactive categories', async () => {
    await Category.create({ key: 'Old', name: 'Old', isActive: false });
    const res = await request(app).get('/api/v1/catalog/categories').expect(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /catalog/categories/:key', () => {
  it('returns a single category', async () => {
    await seedCategory();
    const res = await request(app).get('/api/v1/catalog/categories/AC').expect(200);
    expect(res.body.data.name).toBe('AC');
  });

  it('404s for an unknown key', async () => {
    await request(app).get('/api/v1/catalog/categories/DoesNotExist').expect(404);
  });
});

describe('admin-editable category writes', () => {
  it('rejects category creation with no auth', async () => {
    await request(app).post('/api/v1/catalog/categories').send({ key: 'TV', name: 'TV' }).expect(401);
  });

  it('rejects category creation from a non-admin role', async () => {
    await User.create({
      role: ROLES.CUSTOMER,
      phone: '9111111111',
      name: 'Customer',
      passwordHash: await hashPassword('password123'),
    });
    await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: '9111111111', password: 'password123' });
    const code = readOtpCode('9111111111');
    const verify = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ role: ROLES.CUSTOMER, identifier: '9111111111', code });

    await request(app)
      .post('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${verify.body.data.accessToken}`)
      .send({ key: 'TV', name: 'TV' })
      .expect(403);
  });

  it('lets a super_admin create and edit a category', async () => {
    const token = await loginAsAdmin();
    const auth = { Authorization: `Bearer ${token}` };
    const createRes = await request(app).post('/api/v1/catalog/categories').set(auth).send({ key: 'TV', name: 'TV', color: '#B71C1C' }).expect(201);
    expect(createRes.body.data).toMatchObject({ key: 'TV', productTypes: [], services: [] });

    await request(app).put('/api/v1/catalog/categories/TV').set(auth).send({ categoryNote: 'Wall-mounted or on a stand' }).expect(200);
    const res = await request(app).get('/api/v1/catalog/categories/TV').expect(200);
    expect(res.body.data.categoryNote).toBe('Wall-mounted or on a stand');
  });

  it('rejects creating a category with a key that already exists', async () => {
    await seedCategory();
    const token = await loginAsAdmin();
    await request(app)
      .post('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'AC', name: 'AC Again' })
      .expect(409);
  });

  it('the pre-catalogue per-category price editor is gone (prices live only in the Master Catalogue)', async () => {
    await seedCategory();
    const auth = { Authorization: `Bearer ${await loginAsAdmin()}` };
    await request(app).post('/api/v1/catalog/categories/AC/services').set(auth).send({ slug: 'x', name: 'X', price: 1 }).expect(404);
    await request(app).post('/api/v1/catalog/categories/AC/product-types').set(auth).send({ slug: 'x', name: 'X' }).expect(404);
    await request(app).get('/api/v1/catalog/categories/AC/admin').set(auth).expect(404);
  });
});
