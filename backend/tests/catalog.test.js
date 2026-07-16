import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { ServiceCatalogItem } from '../src/modules/catalog/serviceCatalogItem.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('catalog');

let app;

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

async function loginAsAdmin() {
  await User.create({
    role: ROLES.SUPER_ADMIN,
    email: 'catalog-admin@test.dev',
    name: 'Admin',
    passwordHash: await hashPassword('password123'),
  });
  const capture = captureConsoleLog();
  await request(app)
    .post('/api/v1/auth/login')
    .send({ role: ROLES.SUPER_ADMIN, identifier: 'catalog-admin@test.dev', password: 'password123' });
  const code = capture.code();
  const res = await request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ role: ROLES.SUPER_ADMIN, identifier: 'catalog-admin@test.dev', code });
  return res.body.data.accessToken;
}

async function seedCategory() {
  const category = await Category.create({ key: 'AC', name: 'AC', color: '#0D47A1' });
  await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
  await ServiceCatalogItem.create({ category: category._id, slug: 'repair', name: 'Repair', price: 299 });
  return category;
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
    Category.deleteMany({}),
    ProductType.deleteMany({}),
    ServiceCatalogItem.deleteMany({}),
  ]);
});

describe('GET /catalog/categories', () => {
  it('returns categories with nested productTypes and services in the frontend-compatible shape', async () => {
    await seedCategory();
    const res = await request(app).get('/api/v1/catalog/categories').expect(200);
    expect(res.body.data).toHaveLength(1);
    const [ac] = res.body.data;
    expect(ac.key).toBe('AC');
    expect(ac.productTypes).toEqual([{ id: 'split', name: 'Split AC', icon: undefined, desc: undefined }]);
    expect(ac.services).toEqual([{ id: 'repair', name: 'Repair', icon: undefined, desc: undefined, price: 299, unit: 'per unit' }]);
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

describe('admin-editable catalog writes', () => {
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
    const capture = captureConsoleLog();
    await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: '9111111111', password: 'password123' });
    const code = capture.code();
    const verify = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ role: ROLES.CUSTOMER, identifier: '9111111111', code });

    await request(app)
      .post('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${verify.body.data.accessToken}`)
      .send({ key: 'TV', name: 'TV' })
      .expect(403);
  });

  it('lets a super_admin create a category, then add a product type and a service to it', async () => {
    const token = await loginAsAdmin();

    const createRes = await request(app)
      .post('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'TV', name: 'TV', color: '#B71C1C' })
      .expect(201);
    expect(createRes.body.data.key).toBe('TV');

    await request(app)
      .post('/api/v1/catalog/categories/TV/product-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'led', name: 'LED TV' })
      .expect(201);

    await request(app)
      .post('/api/v1/catalog/categories/TV/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'repair', name: 'Repair', price: 349 })
      .expect(201);

    const res = await request(app).get('/api/v1/catalog/categories/TV').expect(200);
    expect(res.body.data.productTypes).toHaveLength(1);
    expect(res.body.data.services).toHaveLength(1);
    expect(res.body.data.services[0].price).toBe(349);
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
});
