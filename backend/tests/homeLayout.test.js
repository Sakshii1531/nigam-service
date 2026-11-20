import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { HomeTile } from '../src/modules/super-admin/homeTile.model.js';
import { HomeSection } from '../src/modules/super-admin/homeSection.model.js';
import { bustCatalogueCache } from '../src/modules/catalog/catalogCache.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { seedTestCatalogue, clearCatalogue } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// The customer home screen is an ordered list of sections. An admin reorders,
// hides and renames the built-in ones, and adds sections of their own — a row
// of brand/offer cards, or a curated row of bookable services.

let app;
let admin;
let customer;
const flow = jobFlow(() => app, { phoneStart: 9304400000 });
const as = (token) => ({ Authorization: `Bearer ${token}` });
const api = (method, path, body, token = admin) => request(app)[method](`/api/v1${path}`).set(as(token)).send(body);
const publicLayout = async () => (await request(app).get('/api/v1/cms/home-layout').expect(200)).body.data;
const adminLayout = async () => (await api('get', '/cms/home-layout/admin').expect(200)).body.data;
const keys = (rows) => rows.map((s) => s.key || s.title);

const BUILT_IN_ORDER = ['banners', 'categories', 'warranty-offers', 'brand-cards', 'most-booked', 'appliance-services', 'spare-parts', 'reviews', 'stories'];

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('home_layout'));
  await ensureIndexes();
  app = createApp().listen(0);
  await clearCatalogue();
  await seedTestCatalogue();
});
afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all([User, HomeTile, HomeSection].map((m) => m.deleteMany({})));
  bustCatalogueCache();
  await User.create({ role: ROLES.SUPER_ADMIN, email: 'layout-admin@test.dev', name: 'Admin', passwordHash: await hashPassword('password123') });
  admin = await flow.loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: 'layout-admin@test.dev' });
  await User.create({ role: ROLES.CUSTOMER, phone: '9304400001', name: 'Customer', passwordHash: await hashPassword('password123') });
  customer = (await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: '9304400001', password: 'password123' }).expect(200)).body.data.accessToken;
});

describe('the built-in home sections', () => {
  it('appear on first read in the order the app has always used, with no migration', async () => {
    expect(keys(await publicLayout())).toEqual(BUILT_IN_ORDER);
    // Reading again never duplicates them.
    expect(keys(await publicLayout())).toEqual(BUILT_IN_ORDER);
    expect(await HomeSection.countDocuments()).toBe(9);
  });

  it('can be reordered, and the customer layout follows', async () => {
    const sections = await adminLayout();
    const id = (key) => sections.find((s) => s.key === key).id;
    const order = ['brand-cards', 'most-booked', 'banners', 'categories', 'warranty-offers', 'appliance-services', 'spare-parts', 'reviews', 'stories'];
    await api('put', '/cms/home-layout/reorder', { ids: order.map(id) }).expect(200);
    expect(keys(await publicLayout())).toEqual(order);
    expect(keys(await adminLayout())).toEqual(order);
  });

  it('can be hidden and shown (customers stop seeing it, the console still lists it) and renamed', async () => {
    const brand = (await adminLayout()).find((s) => s.key === 'brand-cards');
    await api('put', `/cms/home-layout/${brand.id}`, { isActive: false, title: 'Top brands' }).expect(200);
    expect(keys(await publicLayout())).not.toContain('brand-cards');
    const listed = (await adminLayout()).find((s) => s.key === 'brand-cards');
    expect(listed).toMatchObject({ isActive: false, title: 'Top brands', defaultTitle: 'Brands & Offers' });
    await api('put', `/cms/home-layout/${brand.id}`, { isActive: true }).expect(200);
    expect((await publicLayout()).find((s) => s.key === 'brand-cards').title).toBe('Top brands');
  });

  it('cannot be deleted — only hidden', async () => {
    const stories = (await adminLayout()).find((s) => s.key === 'stories');
    const res = await api('delete', `/cms/home-layout/${stories.id}`).expect(409);
    expect(JSON.stringify(res.body)).toMatch(/hide the section instead/);
    expect(keys(await publicLayout())).toContain('stories');
  });
});

describe('sections an admin creates', () => {
  it('adds a brand-card section at the end with its own cards, kept apart from Brands & Offers', async () => {
    const made = (await api('post', '/cms/home-layout', { kind: 'brand-cards', title: 'Summer deals' }).expect(201)).body.data;
    expect(made).toMatchObject({ kind: 'brand-cards', title: 'Summer deals', builtIn: false, isActive: true });
    expect((await publicLayout()).at(-1).id).toBe(made.id);

    const card = (over = {}) => ({ placement: 'brand-card', brandName: 'VOLTAS', title: 'Cool offers', link: '/book/AC', section: made.id, ...over });
    await api('post', '/cms/home-tiles', card()).expect(201);
    await api('post', '/cms/home-tiles', { placement: 'brand-card', brandName: 'LG', title: 'Built-in card', link: '/buy' }).expect(201);

    const own = (await request(app).get(`/api/v1/cms/home-tiles?placement=brand-card&section=${made.id}`).expect(200)).body.data;
    expect(own.map((t) => t.brandName)).toEqual(['VOLTAS']);
    const builtIn = (await request(app).get('/api/v1/cms/home-tiles?placement=brand-card&section=none').expect(200)).body.data;
    expect(builtIn.map((t) => t.brandName)).toEqual(['LG']);
    expect((await adminLayout()).find((s) => s.id === made.id).tiles).toEqual({ total: 1, active: 1 });
    expect((await adminLayout()).find((s) => s.key === 'brand-cards').tiles).toEqual({ total: 1, active: 1 });
  });

  it('reorders cards inside one section without touching another', async () => {
    const a = (await api('post', '/cms/home-layout', { kind: 'brand-cards', title: 'A' }).expect(201)).body.data;
    const card = (brandName, sortOrder) => api('post', '/cms/home-tiles', { placement: 'brand-card', brandName, title: brandName, section: a.id, sortOrder }).expect(201).then((r) => r.body.data.id);
    const [x, y, z] = [await card('X', 0), await card('Y', 1), await card('Z', 2)];
    await api('put', '/cms/home-tiles/reorder', { placement: 'brand-card', section: a.id, ids: [z, x, y] }).expect(200);
    const rows = (await request(app).get(`/api/v1/cms/home-tiles?placement=brand-card&section=${a.id}`).expect(200)).body.data;
    expect(rows.map((t) => t.brandName)).toEqual(['Z', 'X', 'Y']);
    // A card from this section cannot be reordered as if it belonged to the built-in row.
    await api('put', '/cms/home-tiles/reorder', { placement: 'brand-card', ids: [x] }).expect(400);
  });

  it('adds a curated service row; the home-sections API returns its live service cards by section', async () => {
    const row = (await api('post', '/cms/home-layout', { kind: 'service-row', title: 'Festive deep cleaning', seeAllLink: '/services' }).expect(201)).body.data;
    expect(row.seeAllLink).toBe('/services');
    const groups = (await api('get', '/super-admin/catalogue/service-groups').expect(200)).body.data;
    const split = groups.find((g) => g.title === 'Split AC Installation');
    const tile = (await api('post', '/cms/home-tiles', { placement: 'appliance-service', section: row.id, target: { productType: split.productTypeId, service: split.serviceId } }).expect(201)).body.data;
    expect(tile.title).toBe('Split AC Installation');

    bustCatalogueCache();
    const home = (await request(app).get('/api/v1/catalog/home-sections').expect(200)).body.data;
    expect(home.custom[row.id].map((c) => c.title)).toEqual(['Split AC Installation']);
    expect(home.custom[row.id][0]).toMatchObject({ fromPrice: expect.any(Number) });
    // The built-in "Appliance repair & service" row does not pick it up.
    expect(home.applianceServices.map((c) => c.title)).not.toContain('Split AC Installation');
  });

  it('deleting a custom section deletes its tiles too', async () => {
    const made = (await api('post', '/cms/home-layout', { kind: 'brand-cards', title: 'Temp' }).expect(201)).body.data;
    await api('post', '/cms/home-tiles', { placement: 'brand-card', brandName: 'ACME', title: 'T', section: made.id }).expect(201);
    const res = await api('delete', `/cms/home-layout/${made.id}`).expect(200);
    expect(res.body.data).toMatchObject({ deleted: true, tilesRemoved: 1 });
    expect(await HomeTile.countDocuments({ section: made.id })).toBe(0);
    expect(keys(await publicLayout())).toEqual(BUILT_IN_ORDER);
  });
});

describe('what is refused', () => {
  it('only brand-card or service-row can be created, with a heading', async () => {
    await api('post', '/cms/home-layout', { kind: 'stories', title: 'More stories' }).expect(400);
    await api('post', '/cms/home-layout', { kind: 'brand-cards', title: '   ' }).expect(400);
    await api('post', '/cms/home-layout', { kind: 'brand-cards', title: 'X'.repeat(61) }).expect(400);
  });

  it('keeps a section\'s tiles of the right kind, and only in custom sections', async () => {
    const brands = (await api('post', '/cms/home-layout', { kind: 'brand-cards', title: 'Brands 2' }).expect(201)).body.data;
    const groups = (await api('get', '/super-admin/catalogue/service-groups').expect(200)).body.data;
    const g = groups[0];
    // a service tile into a brand-card section
    const wrongKind = await api('post', '/cms/home-tiles', { placement: 'appliance-service', section: brands.id, target: { productType: g.productTypeId, service: g.serviceId } }).expect(400);
    expect(JSON.stringify(wrongKind.body)).toMatch(/holds brand cards/);
    // a tile into a built-in section, or into one that does not exist
    const builtIn = (await adminLayout()).find((s) => s.key === 'brand-cards');
    await api('post', '/cms/home-tiles', { placement: 'brand-card', brandName: 'A', title: 'A', section: builtIn.id }).expect(400);
    await api('post', '/cms/home-tiles', { placement: 'brand-card', brandName: 'A', title: 'A', section: new mongoose.Types.ObjectId().toString() }).expect(400);
  });

  it('only a service row has a "See all" link, and it must be a safe link', async () => {
    const cards = (await api('post', '/cms/home-layout', { kind: 'brand-cards', title: 'C' }).expect(201)).body.data;
    const rowRes = (await api('post', '/cms/home-layout', { kind: 'service-row', title: 'R' }).expect(201)).body.data;
    await api('put', `/cms/home-layout/${cards.id}`, { seeAllLink: '/buy' }).expect(400);
    await api('put', `/cms/home-layout/${rowRes.id}`, { seeAllLink: 'javascript:alert(1)' }).expect(400);
    await api('put', `/cms/home-layout/${rowRes.id}`, { seeAllLink: '/services' }).expect(200);
  });

  it('refuses a reorder with unknown or repeated sections', async () => {
    const sections = await adminLayout();
    await api('put', '/cms/home-layout/reorder', { ids: [new mongoose.Types.ObjectId().toString()] }).expect(400);
    await api('put', '/cms/home-layout/reorder', { ids: [sections[0].id, sections[0].id] }).expect(400);
  });

  it('is for super-admins only; the customer layout needs no login', async () => {
    await api('post', '/cms/home-layout', { kind: 'brand-cards', title: 'X' }, customer).expect(403);
    await request(app).post('/api/v1/cms/home-layout').send({ kind: 'brand-cards', title: 'X' }).expect(401);
    await api('get', '/cms/home-layout/admin', null, customer).expect(403);
    await api('put', '/cms/home-layout/reorder', { ids: [new mongoose.Types.ObjectId().toString()] }, customer).expect(403);
    await request(app).get('/api/v1/cms/home-layout').expect(200);
  });
});
