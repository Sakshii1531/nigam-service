import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { HomeSection } from '../src/modules/super-admin/homeSection.model.js';
import { Banner } from '../src/modules/super-admin/banner.model.js';
import { bustCatalogueCache } from '../src/modules/catalog/catalogCache.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// An admin can add banner carousels to the customer home screen, anywhere in
// the layout. Each owns its own banners; they never leak into the main
// carousels, and the warranty strip under the categories is editable too.

let app;
let admin;
const flow = jobFlow(() => app, { phoneStart: 9304500000 });
const as = (token) => ({ Authorization: `Bearer ${token}` });
const api = (method, path, body) => request(app)[method](`/api/v1${path}`).set(as(admin)).send(body);
const IMG = 'https://res.cloudinary.com/demo/image/upload/banner.png';

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('home_banners'));
  await ensureIndexes();
  app = createApp().listen(0);
});
afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all([User, HomeSection, Banner].map((m) => m.deleteMany({})));
  bustCatalogueCache();
  await User.create({ role: ROLES.SUPER_ADMIN, email: 'banner-admin@test.dev', name: 'Admin', passwordHash: await hashPassword('password123') });
  admin = await flow.loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: 'banner-admin@test.dev' });
});

describe('banner carousel sections', () => {
  it('can be added at the end of the home layout and positioned anywhere', async () => {
    const made = (await api('post', '/cms/home-layout', { kind: 'banner-carousel', title: 'Festive banners' }).expect(201)).body.data;
    expect(made).toMatchObject({ kind: 'banner-carousel', title: 'Festive banners', builtIn: false });
    const ids = (await api('get', '/cms/home-layout/admin').expect(200)).body.data.map((s) => s.id);
    expect(ids[ids.length - 1]).toBe(made.id);
    await api('put', '/cms/home-layout/reorder', { ids: [made.id, ...ids.filter((id) => id !== made.id)] }).expect(200);
    const top = (await request(app).get('/api/v1/cms/home-layout').expect(200)).body.data[0];
    expect(top.id).toBe(made.id);
  });

  it('owns its banners: they stay out of the main carousels and are listed under their section', async () => {
    const section = (await api('post', '/cms/home-layout', { kind: 'banner-carousel', title: 'Festive banners' }).expect(201)).body.data;
    await api('post', '/cms/banners', { imageUrl: IMG, app: 'customer', segment: 'non-warranty' }).expect(201);
    const own = (await api('post', '/cms/banners', { imageUrl: IMG, app: 'customer', section: section.id, link: '/services' }).expect(201)).body.data;
    expect(own).toMatchObject({ link: '/services', segment: 'non-warranty' });

    const main = (await request(app).get('/api/v1/cms/banners?app=customer').expect(200)).body.data;
    expect(main).toHaveLength(1);
    const sectioned = (await request(app).get('/api/v1/cms/banners?app=customer&sections=only').expect(200)).body.data;
    expect(sectioned.map((b) => b.id)).toEqual([own.id]);
    const byId = (await request(app).get(`/api/v1/cms/banners?app=customer&section=${section.id}`).expect(200)).body.data;
    expect(byId.map((b) => b.id)).toEqual([own.id]);
    expect((await api('get', '/cms/banners/admin?app=customer').expect(200)).body.data).toHaveLength(1);

    const listed = (await api('get', '/cms/home-layout/admin').expect(200)).body.data.find((s) => s.id === section.id);
    expect(listed.tiles).toEqual({ total: 1, active: 1 });
    expect(listed.headingShown).toBe(false);
  });

  it('only accepts banners for a banner section, and safe links', async () => {
    const cards = (await api('post', '/cms/home-layout', { kind: 'brand-cards', title: 'Cards' }).expect(201)).body.data;
    await api('post', '/cms/banners', { imageUrl: IMG, app: 'customer', section: cards.id }).expect(400);
    await api('post', '/cms/banners', { imageUrl: IMG, app: 'customer', section: '0123456789abcdef01234567' }).expect(400);
    await api('post', '/cms/banners', { imageUrl: IMG, app: 'customer', link: 'javascript:alert(1)' }).expect(400);
  });

  it('can be hidden banner by banner, and deleting the section deletes its banners', async () => {
    const section = (await api('post', '/cms/home-layout', { kind: 'banner-carousel', title: 'Temp' }).expect(201)).body.data;
    const banner = (await api('post', '/cms/banners', { imageUrl: IMG, app: 'customer', section: section.id }).expect(201)).body.data;
    await api('put', `/cms/banners/${banner.id}`, { isActive: false }).expect(200);
    expect((await request(app).get('/api/v1/cms/banners?app=customer&sections=only').expect(200)).body.data).toHaveLength(0);
    const res = await api('delete', `/cms/home-layout/${section.id}`).expect(200);
    expect(res.body.data).toMatchObject({ deleted: true, tilesRemoved: 1 });
    expect(await Banner.countDocuments({ section: section.id })).toBe(0);
  });
});

describe('the warranty strip under the categories', () => {
  it('has its own banner set, separate from the main carousels', async () => {
    await api('post', '/cms/banners', { imageUrl: IMG, app: 'customer', segment: 'warranty-offers' }).expect(201);
    await api('post', '/cms/banners', { imageUrl: IMG, app: 'customer', segment: 'warranty' }).expect(201);
    const all = (await request(app).get('/api/v1/cms/banners?app=customer').expect(200)).body.data;
    expect(all.map((b) => b.segment).sort()).toEqual(['warranty', 'warranty-offers']);
    const strip = (await api('get', '/cms/home-layout/admin').expect(200)).body.data.find((s) => s.key === 'warranty-offers');
    expect(strip.tiles).toEqual({ total: 1, active: 1 });
  });
});
