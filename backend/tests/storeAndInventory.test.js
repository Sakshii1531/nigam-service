import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Product } from '../src/modules/buy-commerce/product.model.js';
import { Order } from '../src/modules/buy-commerce/order.model.js';
import { SparePartCatalog } from '../src/modules/super-admin/sparePartCatalog.model.js';
import { SparePartStockMovement } from '../src/modules/super-admin/sparePartStockMovement.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// docs/master-catalogue Phases 20–21: NCC Products as detailed listings with
// an admin detail view (sales included), and spare parts with compatibility,
// pictures and a stock history.

const TEST_DB_URI = testDbUri('store_inventory');
let app;
let admin;
const flow = jobFlow(() => app, { phoneStart: 9302000000 });
const as = (token) => ({
  get: (path) => request(app).get(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
  post: (path, body) => request(app).post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body),
  put: (path, body) => request(app).put(`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

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
  await Promise.all([User, Product, Order, SparePartCatalog, SparePartStockMovement].map((m) => m.deleteMany({})));
  await User.create({ role: ROLES.SUPER_ADMIN, email: 'store-admin@test.dev', name: 'Admin', passwordHash: await hashPassword('password123') });
  admin = await flow.loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: 'store-admin@test.dev' });
});

const splitAc = {
  category: 'Air Conditioner',
  name: 'Voltas 1.5 Ton 5 Star Inverter Split AC',
  brand: 'Voltas',
  modelNumber: '185V Vectra',
  colour: 'White',
  originalPrice: 52990,
  price: 38990,
  specs: ['1.5 Ton', '5 Star', 'Inverter compressor'],
  description: 'Cools a 150–180 sq ft room.',
  specifications: [
    { group: 'General', items: [{ label: 'Type', value: 'Split' }, { label: 'Capacity', value: '1.5 Ton' }] },
    { group: 'Dimensions', items: [{ label: 'Indoor unit (W×H×D)', value: '89 × 29 × 21 cm' }] },
  ],
  inTheBox: ['Indoor unit', 'Outdoor unit', 'Remote'],
  warrantyMonths: 12,
  warrantySummary: '1 year on product, 5 years on compressor',
  returnDays: 10,
  codAvailable: false,
  installationIncluded: true,
  manufacturer: 'Voltas Ltd, Mumbai',
  countryOfOrigin: 'India',
  stock: 4,
  lowStockThreshold: 5,
  images: ['https://res.cloudinary.com/demo/image/upload/ac-1.jpg', 'https://res.cloudinary.com/demo/image/upload/ac-2.jpg'],
};

describe('NCC Products (Phase 20)', () => {
  it('stores a detailed listing; the first gallery picture is the main image; discount and stock status are derived', async () => {
    const res = await as(admin).post('/products', splitAc).expect(201);
    expect(res.body.data).toMatchObject({
      specifications: splitAc.specifications,
      inTheBox: splitAc.inTheBox,
      imageUrl: splitAc.images[0],
      discountPercent: 26,
      stockStatus: 'Low Stock',
      codAvailable: false,
      returnDays: 10,
    });
    // The customer reads the same fields.
    const pub = await request(app).get(`/api/v1/products/${res.body.data.id}`).expect(200);
    expect(pub.body.data.warrantySummary).toBe(splitAc.warrantySummary);

    const edited = await as(admin).put(`/products/${res.body.data.id}`, { images: [splitAc.images[1]] }).expect(200);
    expect(edited.body.data.imageUrl).toBe(splitAc.images[1]);
  });

  it('refuses an MRP below the selling price, on create and on edit', async () => {
    await as(admin).post('/products', { ...splitAc, originalPrice: 30000 }).expect(400);
    const created = await as(admin).post('/products', splitAc).expect(201);
    await as(admin).put(`/products/${created.body.data.id}`, { price: 60000 }).expect(400);
  });

  it('a duplicate SKU is a clear 409', async () => {
    await as(admin).post('/products', { ...splitAc, sku: 'AC-VOL-1' }).expect(201);
    const res = await as(admin).post('/products', { ...splitAc, sku: 'AC-VOL-1' }).expect(409);
    expect(res.body.error.message).toBe('SKU "AC-VOL-1" is already used by another product');
  });

  it('admin list includes inactive products, filters by stock, and counts units sold', async () => {
    const ac = await Product.create(splitAc);
    await Product.create({ ...splitAc, name: 'Retired AC', sku: 'OLD-1', isActive: false, stock: 50 });
    await Product.create({ ...splitAc, name: 'Sold-out AC', sku: 'OUT-1', stock: 0 });
    const cust = await flow.customer();
    await Order.create([
      { user: cust.user._id, items: [{ product: ac._id, name: ac.name, price: 38990, quantity: 2 }], subtotal: 77980, total: 77980, status: 'Delivered' },
      { user: cust.user._id, items: [{ product: ac._id, name: ac.name, price: 38990, quantity: 1 }], subtotal: 38990, total: 38990, status: 'Cancelled' },
    ]);

    const all = await as(admin).get('/products/manage?limit=50').expect(200);
    expect(all.body.data).toHaveLength(3);
    expect(all.body.data.find((p) => p.id === ac.id).sales).toEqual({ unitsSold: 2, revenue: 77980, orders: 1 });
    expect((await as(admin).get('/products/manage?stock=out').expect(200)).body.data.map((p) => p.name)).toEqual(['Sold-out AC']);
    expect((await as(admin).get('/products/manage?status=inactive').expect(200)).body.data.map((p) => p.name)).toEqual(['Retired AC']);
    expect((await as(admin).get('/products/manage?search=vectra').expect(200)).body.data).toHaveLength(3);

    const detail = await as(admin).get(`/products/manage/${ac.id}`).expect(200);
    expect(detail.body.data.recentOrders.map((o) => o.status)).toEqual(expect.arrayContaining(['Delivered', 'Cancelled']));
    // The customer store still hides the inactive one.
    expect((await request(app).get('/api/v1/products').expect(200)).body.data.map((p) => p.name)).not.toContain('Retired AC');
  });

  it('is admin-only', async () => {
    const cust = await flow.customer();
    await as(cust.token).get('/products/manage').expect(403);
  });

  it('Pay on Delivery is refused for a product that does not allow it', async () => {
    const ac = await Product.create(splitAc);
    const cust = await flow.customer();
    const res = await as(cust.token).post('/orders', { items: [{ productId: ac.id, quantity: 1 }], paymentMethod: 'COD' }).expect(400);
    expect(res.body.error.message).toMatch(/Pay on Delivery is not available/);
  });
});

const membrane = {
  name: 'RO Membrane 80 GPD',
  brand: 'Kent',
  code: 'KNT-MEM-80',
  category: 'RO Water Purifier',
  compatibleBrands: ['Kent', 'Aquaguard'],
  compatibleModels: ['Kent Grand', 'Kent Pride'],
  description: 'Thin-film composite membrane.',
  specifications: [{ label: 'Flow', value: '80 GPD' }],
  images: ['https://res.cloudinary.com/demo/image/upload/membrane.jpg'],
  unit: 'piece',
  warrantyMonths: 6,
  costPrice: 1000,
  markupPercent: 30,
  stock: 12,
  reorderThreshold: 5,
  storageLocation: 'Rack B-3',
};

describe('Inventory (Phase 21)', () => {
  it('creates a detailed part with an opening-stock entry; pricing and stock value are derived', async () => {
    const res = await as(admin).post('/super-admin/spare-parts', membrane).expect(201);
    expect(res.body.data).toMatchObject({ retailPrice: 1300, marginPerUnit: 300, stockValue: 12000, imageUrl: membrane.images[0], status: 'In Stock' });
    const detail = await as(admin).get(`/super-admin/spare-parts/${res.body.data.id}`).expect(200);
    expect(detail.body.data.movements).toEqual([expect.objectContaining({ type: 'OPENING', quantity: 12, stockAfter: 12 })]);
  });

  it('restock, issue and adjust are recorded with their reason; stock never goes below zero', async () => {
    const part = (await as(admin).post('/super-admin/spare-parts', membrane).expect(201)).body.data;
    await as(admin).post(`/super-admin/spare-parts/${part.id}/stock`, { type: 'RESTOCK', quantity: 20, reason: 'PO 4411' }).expect(200);
    await as(admin).post(`/super-admin/spare-parts/${part.id}/stock`, { type: 'ISSUE', quantity: 5, reason: 'Sent to Lucknow partner' }).expect(200);
    const adjusted = await as(admin).post(`/super-admin/spare-parts/${part.id}/stock`, { type: 'ADJUSTMENT', quantity: -2, reason: 'Damaged' }).expect(200);
    expect(adjusted.body.data.stock).toBe(25);
    expect(adjusted.body.data.movements.map((m) => [m.type, m.quantity, m.stockAfter, m.reason])).toEqual([
      ['ADJUSTMENT', -2, 25, 'Damaged'],
      ['ISSUE', -5, 27, 'Sent to Lucknow partner'],
      ['RESTOCK', 20, 32, 'PO 4411'],
      ['OPENING', 12, 12, 'Opening stock'],
    ]);
    await as(admin).post(`/super-admin/spare-parts/${part.id}/stock`, { type: 'ISSUE', quantity: 99, reason: 'Too many' }).expect(400);
    await as(admin).post(`/super-admin/spare-parts/${part.id}/stock`, { type: 'RESTOCK', quantity: 5 }).expect(400);

    // A stock edit through the part form is recorded too.
    await as(admin).put(`/super-admin/spare-parts/${part.id}`, { stock: 30, stockReason: 'Stock count' }).expect(200);
    const detail = await as(admin).get(`/super-admin/spare-parts/${part.id}`).expect(200);
    expect(detail.body.data.movements[0]).toMatchObject({ type: 'ADJUSTMENT', quantity: 5, stockAfter: 30, reason: 'Stock count' });
  });

  it('list: search by model, filter by appliance (main or compatible) and stock; summary cards', async () => {
    await as(admin).post('/super-admin/spare-parts', membrane).expect(201);
    await as(admin).post('/super-admin/spare-parts', { name: 'AC Capacitor 45 µF', category: 'AC', compatibleCategories: ['Air Cooler'], costPrice: 200, stock: 2 }).expect(201);
    await as(admin).post('/super-admin/spare-parts', { name: 'Fan motor', category: 'AC', costPrice: 800, stock: 0 }).expect(201);

    const byModel = await as(admin).get('/super-admin/spare-parts?search=pride').expect(200);
    expect(byModel.body.data.map((p) => p.name)).toEqual(['RO Membrane 80 GPD']);
    const cooler = await as(admin).get('/super-admin/spare-parts?category=Air%20Cooler').expect(200);
    expect(cooler.body.data.map((p) => p.name)).toEqual(['AC Capacitor 45 µF']);
    const low = await as(admin).get('/super-admin/spare-parts?stock=low').expect(200);
    expect(low.body.data.map((p) => p.name)).toEqual(['AC Capacitor 45 µF']);
    expect(low.body.meta.summary).toEqual({ parts: 3, units: 14, stockValue: 12400, outOfStock: 1, lowStock: 1 });
  });
});
