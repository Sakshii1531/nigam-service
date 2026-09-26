import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { HomeTile } from '../src/modules/super-admin/homeTile.model.js';
import { Story } from '../src/modules/super-admin/story.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { Review } from '../src/modules/reviews/review.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { bustCatalogueCache } from '../src/modules/catalog/catalogCache.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { seedHomeSections } from '../scripts/seedHomeSections.js';
import { seedTestCatalogue, clearCatalogue } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// docs/master-catalogue Phase 22: the home screen's "Most Booked Services"
// and "Appliance repair & service" rows and Stories — every card a bookable
// catalogue service with a live price, a real "Instant" and a real rating.

const TEST_DB_URI = testDbUri('home_sections');
let app;
let admin;
let groups;
const flow = jobFlow(() => app, { phoneStart: 9302200000 });
const adminApi = (method, path, body) => request(app)[method](`/api/v1${path}`).set('Authorization', `Bearer ${admin}`).send(body);
const sections = async () => (await request(app).get('/api/v1/catalog/home-sections').expect(200)).body.data;
const group = (title) => groups.find((g) => g.title === title);
const target = (g) => ({ productType: g.productTypeId, service: g.serviceId });

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
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
  await Promise.all([User, HomeTile, Story, Booking, Review].map((m) => m.deleteMany({})));
  bustCatalogueCache();
  await User.create({ role: ROLES.SUPER_ADMIN, email: 'home-admin@test.dev', name: 'Admin', passwordHash: await hashPassword('password123') });
  admin = await flow.loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: 'home-admin@test.dev' });
  groups = (await adminApi('get', '/super-admin/catalogue/service-groups').expect(200)).body.data;
});

/** Raw booking + review rows — only the fields the home rows read. */
async function booked(g, { times = 1, rating = null, status = 'Completed' } = {}) {
  const user = new mongoose.Types.ObjectId();
  for (let i = 0; i < times; i += 1) {
    const { insertedId } = await Booking.collection.insertOne({
      status,
      createdAt: new Date(),
      commercial: { productType: g.productTypeId ? { id: g.productTypeId } : null, service: { id: g.serviceId } },
    });
    if (rating) await Review.collection.insertOne({ booking: insertedId, user, rating, createdAt: new Date() });
  }
}

describe('service tiles point at real catalogue services', () => {
  it('a tile shows the service’s live price and link; its title defaults to the service name', async () => {
    const split = group('Split AC Installation');
    const created = await adminApi('post', '/cms/home-tiles', { placement: 'appliance-service', target: target(split) }).expect(201);
    expect(created.body.data.title).toBe('Split AC Installation');

    const { applianceServices } = await sections();
    expect(applianceServices).toEqual([
      expect.objectContaining({ title: 'Split AC Installation', fromPrice: 1399, deepLink: split.deepLink, rating: null, reviewCount: 0, instant: split.instant }),
    ]);
  });

  it('refuses a tile without a service, or with a product type from another category', async () => {
    await adminApi('post', '/cms/home-tiles', { placement: 'most-booked', title: 'AC repair' }).expect(400);
    const split = group('Split AC Installation');
    const fan = group('Fan Installation');
    await adminApi('post', '/cms/home-tiles', { placement: 'most-booked', target: { productType: split.productTypeId, service: fan.serviceId } }).expect(400);
  });

  it('"Instant" follows the service’s express setting, and a price change shows at once', async () => {
    const split = group('Split AC Installation');
    await adminApi('post', '/cms/home-tiles', { placement: 'appliance-service', target: target(split) }).expect(201);
    await ServiceOffering.updateMany({ productType: split.productTypeId, service: split.serviceId }, { 'express.enabled': false });
    expect((await sections()).applianceServices[0].instant).toBe(false);
    await ServiceOffering.updateMany({ productType: split.productTypeId, service: split.serviceId }, { 'express.enabled': true });
    expect((await sections()).applianceServices[0].instant).toBe(true);
  });

  it('a tile whose service is no longer bookable disappears', async () => {
    const fan = group('Fan Installation');
    await adminApi('post', '/cms/home-tiles', { placement: 'appliance-service', target: target(fan) }).expect(201);
    expect((await sections()).applianceServices).toHaveLength(1);
    await ServiceOffering.updateMany({ service: fan.serviceId }, { isActive: false });
    expect((await sections()).applianceServices).toHaveLength(0);
    await ServiceOffering.updateMany({ service: fan.serviceId }, { isActive: true });
  });
});

describe('Most Booked is real', () => {
  it('pinned tiles first, then the services actually booked most; cancelled bookings do not count', async () => {
    const split = group('Split AC Installation');
    const fan = group('Fan Installation');
    const tank = groups.find((g) => /Water Tank/i.test(g.title));
    await adminApi('post', '/cms/home-tiles', { placement: 'most-booked', target: target(split) }).expect(201);
    await booked(fan, { times: 3 });
    await booked(tank, { times: 1 });
    await booked(tank, { times: 5, status: 'Cancelled' });

    const { mostBooked } = await sections();
    expect(mostBooked.map((c) => [c.title, c.pinned, c.bookingCount])).toEqual([
      ['Split AC Installation', true, 0],
      ['Fan Installation', false, 3],
      [tank.title, false, 1],
    ]);
  });

  it('with no pins and no bookings the row is empty — nothing invented', async () => {
    expect((await sections()).mostBooked).toEqual([]);
  });

  it('the rating is the average of real reviews of that service’s bookings', async () => {
    const fan = group('Fan Installation');
    await booked(fan, { rating: 5 });
    await booked(fan, { rating: 4 });
    await booked(fan, { rating: 4 });
    const card = (await sections()).mostBooked.find((c) => c.title === 'Fan Installation');
    expect(card).toMatchObject({ rating: 4.3, reviewCount: 3 });
  });
});

describe('stories and seed', () => {
  it('a story with a service gets a "Book now" link; one without does not', async () => {
    const fan = group('Fan Installation');
    await adminApi('post', '/cms/stories', { title: 'Summer fans', type: 'Informational', target: target(fan) }).expect(201);
    await adminApi('post', '/cms/stories', { title: 'Tips', type: 'Informational' }).expect(201);
    const stories = (await request(app).get('/api/v1/cms/stories').expect(200)).body.data;
    expect(stories.find((s) => s.title === 'Summer fans')).toMatchObject({ bookLink: fan.deepLink, bookTitle: 'Fan Installation' });
    expect(stories.find((s) => s.title === 'Tips').bookLink).toBeNull();
  });

  it('the seed replaces old free-text tiles with catalogue tiles and never stores a rating or badge', async () => {
    await HomeTile.collection.insertOne({ placement: 'most-booked', title: 'Women Salon', rating: 4.8, badge: 'Best Seller', isActive: true, sortOrder: 0 });
    const result = await seedHomeSections();
    expect(result.removedLegacy).toBe(1);
    const tiles = await HomeTile.find({ placement: { $in: ['most-booked', 'appliance-service'] } }).lean();
    expect(tiles.length).toBe(result.created);
    for (const t of tiles) {
      expect(t.target.service).toBeDefined();
      expect(t).not.toHaveProperty('rating');
      expect(t).not.toHaveProperty('badge');
    }
    const { applianceServices } = await sections();
    expect(applianceServices.length).toBeGreaterThan(0);
    expect(applianceServices.every((c) => c.fromPrice > 0 && c.deepLink.startsWith('/book/'))).toBe(true);
    // Running it again changes nothing.
    expect(await seedHomeSections()).toEqual({ removedLegacy: 0, created: 0 });
  });
});
