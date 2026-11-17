import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { HomeTile } from '../src/modules/super-admin/homeTile.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

// Home screen "Brands & Offers" cards (placement "brand-card"): the admin's
// full create / edit / hide / reorder / delete lifecycle, what customers get to
// see, and the link rules (a card's link is opened by every customer who taps it).

let app;
let admin;
let customer;

const card = (over = {}) => ({
  placement: 'brand-card',
  brandName: 'LLOYD',
  title: 'New Launch Glacier Series AC',
  subtitle: 'Experience Superior Cooling & Comfort',
  buttonText: 'Explore on NCC',
  link: '/book/AC',
  gradient: 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
  textColor: '#014694',
  ...over,
});
const as = (token) => ({ Authorization: `Bearer ${token}` });
const create = (body, token = admin) => request(app).post('/api/v1/cms/home-tiles').set(as(token)).send(body);
const publicCards = async () => (await request(app).get('/api/v1/cms/home-tiles?placement=brand-card').expect(200)).body.data;
const adminCards = async () => (await request(app).get('/api/v1/cms/home-tiles/admin?placement=brand-card').set(as(admin)).expect(200)).body.data;

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('home_tiles'));
  await ensureIndexes();
  app = createApp().listen(0);
});
afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), HomeTile.deleteMany({})]);
  const email = 'tiles-admin@test.local';
  await User.create({ role: ROLES.SUPER_ADMIN, name: 'Super Admin', email, passwordHash: await hashPassword('password123'), status: 'Active' });
  await request(app).post('/api/v1/auth/login').send({ role: ROLES.SUPER_ADMIN, identifier: email, password: 'password123' }).expect(200);
  admin = (await request(app).post('/api/v1/auth/otp/verify').send({ role: ROLES.SUPER_ADMIN, identifier: email, code: readOtpCode(email) }).expect(200)).body.data.accessToken;
  await User.create({ role: ROLES.CUSTOMER, phone: '9300000001', name: 'Customer', passwordHash: await hashPassword('password123') });
  customer = (await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: '9300000001', password: 'password123' }).expect(200)).body.data.accessToken;
});

describe('Brands & Offers cards — admin CRUD', () => {
  it('creates, lists, edits and deletes a card, and customers see each change', async () => {
    expect(await publicCards()).toEqual([]);

    const made = await create(card()).expect(201);
    const id = made.body.data.id;
    expect((await publicCards()).map((c) => c.brandName)).toEqual(['LLOYD']);

    await request(app).put(`/api/v1/cms/home-tiles/${id}`).set(as(admin)).send({ title: 'Glacier Series 2027', link: 'https://www.lloyd.in' }).expect(200);
    const [edited] = await publicCards();
    expect(edited).toMatchObject({ title: 'Glacier Series 2027', link: 'https://www.lloyd.in', brandName: 'LLOYD' });

    await request(app).delete(`/api/v1/cms/home-tiles/${id}`).set(as(admin)).expect(200);
    expect(await publicCards()).toEqual([]);
    await request(app).delete(`/api/v1/cms/home-tiles/${id}`).set(as(admin)).expect(404);
  });

  it('hides a card from customers without deleting it, and shows it again', async () => {
    const id = (await create(card()).expect(201)).body.data.id;
    await request(app).put(`/api/v1/cms/home-tiles/${id}`).set(as(admin)).send({ isActive: false }).expect(200);
    expect(await publicCards()).toEqual([]);
    expect((await adminCards()).map((c) => [c.id, c.isActive])).toEqual([[id, false]]);
    await request(app).put(`/api/v1/cms/home-tiles/${id}`).set(as(admin)).send({ isActive: true }).expect(200);
    expect(await publicCards()).toHaveLength(1);
  });

  it('saves a new order in one call, for customers and the console alike', async () => {
    const ids = [];
    for (const [i, name] of ['LLOYD', 'SAMSUNG', 'DAIKIN'].entries()) ids.push((await create(card({ brandName: name, sortOrder: i })).expect(201)).body.data.id);
    expect((await publicCards()).map((c) => c.brandName)).toEqual(['LLOYD', 'SAMSUNG', 'DAIKIN']);

    await request(app).put('/api/v1/cms/home-tiles/reorder').set(as(admin)).send({ placement: 'brand-card', ids: [ids[2], ids[0], ids[1]] }).expect(200);
    expect((await publicCards()).map((c) => c.brandName)).toEqual(['DAIKIN', 'LLOYD', 'SAMSUNG']);
    expect((await adminCards()).map((c) => c.brandName)).toEqual(['DAIKIN', 'LLOYD', 'SAMSUNG']);
  });

  it('refuses a reorder that mixes in another row\'s tiles, or repeats a tile', async () => {
    const mine = (await create(card()).expect(201)).body.data.id;
    const other = (await create({ placement: 'category', title: 'AC', icon: 'ac' }).expect(201)).body.data.id;
    await request(app).put('/api/v1/cms/home-tiles/reorder').set(as(admin)).send({ placement: 'brand-card', ids: [mine, other] }).expect(400);
    await request(app).put('/api/v1/cms/home-tiles/reorder').set(as(admin)).send({ placement: 'brand-card', ids: [mine, mine] }).expect(400);
  });
});

describe('Brands & Offers cards — what is refused', () => {
  it('needs a brand name and a headline', async () => {
    const noBrand = await create(card({ brandName: undefined })).expect(400);
    expect(JSON.stringify(noBrand.body)).toMatch(/Brand name is required/);
    await create(card({ title: undefined })).expect(400);
    const id = (await create(card()).expect(201)).body.data.id;
    await request(app).put(`/api/v1/cms/home-tiles/${id}`).set(as(admin)).send({ brandName: '' }).expect(400);
  });

  it('only follows in-app paths or http(s) addresses — never script or protocol-relative links', async () => {
    for (const link of ['javascript:alert(1)', 'data:text/html,<script>1</script>', '//evil.example.com', 'ftp://files.example.com', '/ spaced path']) {
      await create(card({ link })).expect(400);
    }
    for (const link of ['/book/AC', '/buy/amc/select-appliance', 'https://www.samsung.com/in', '']) {
      const res = await create(card({ link, brandName: `B${link.length}` })).expect(201);
      await request(app).delete(`/api/v1/cms/home-tiles/${res.body.data.id}`).set(as(admin)).expect(200);
    }
  });

  it('rejects an invalid colour and over-long text', async () => {
    await create(card({ textColor: 'red' })).expect(400);
    await create(card({ brandName: 'X'.repeat(41) })).expect(400);
    await create(card({ buttonText: 'Y'.repeat(31) })).expect(400);
  });

  it('is for super-admins only; the public list needs no login', async () => {
    await create(card(), customer).expect(403);
    await request(app).post('/api/v1/cms/home-tiles').send(card()).expect(401);
    await request(app).put('/api/v1/cms/home-tiles/reorder').set(as(customer)).send({ placement: 'brand-card', ids: ['a'.repeat(24)] }).expect(403);
    await request(app).get('/api/v1/cms/home-tiles?placement=brand-card').expect(200);
  });
});
