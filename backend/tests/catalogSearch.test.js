import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { seedTestCatalogue, clearCatalogue } from './helpers/catalogue.js';
import { testDbUri } from './helpers/testDb.js';

// Master Catalogue search & label resolution (docs/master-catalogue Phase 6),
// on the real seeded catalogue.

const TEST_DB_URI = testDbUri('catalog_search');
let app;

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
  await ServiceOffering.updateMany({}, { isActive: true });
});

const search = async (q) => (await request(app).get(`/api/v1/catalog/search?q=${encodeURIComponent(q)}`).expect(200)).body.data;
const titles = (data) => data.groups.map((g) => g.title);

describe('GET /catalog/search — the client\'s example queries', () => {
  it('"AC installation" → Split AC Installation (from ₹1,399) and Window AC Installation ₹599, nothing else', async () => {
    const data = await search('AC installation');
    expect(titles(data).sort()).toEqual(['Split AC Installation', 'Window AC Installation']);
    const split = data.groups.find((g) => g.title === 'Split AC Installation');
    expect(split).toMatchObject({ fromPrice: 1399, offeringCount: 3, deepLink: '/book/AC?pt=split&svc=installation' });
    const window = data.groups.find((g) => g.title === 'Window AC Installation');
    expect(window).toMatchObject({ fromPrice: 599, offeringCount: 1, deepLink: '/book/AC?pt=window&svc=installation&offering=AC-WINDOW-INSTALL' });
  });

  it('"Fan installation" → Fan Installation ₹299 first', async () => {
    const data = await search('Fan installation');
    expect(data.groups[0]).toMatchObject({ title: 'Fan Installation', fromPrice: 299, deepLink: '/book/Electrician?svc=fan_installation&offering=ELEC-FAN-INSTALL' });
    // Switch / Socket Installation only match through the Electrician keyword "fan".
    expect(data.groups.map((g) => g.title)).toEqual(['Fan Installation']);
  });

  it('"Water tank cleaning" → Water Tank Cleaning from ₹499 (4 tank sizes)', async () => {
    const data = await search('Water tank cleaning');
    expect(data.groups[0]).toMatchObject({ title: 'Water Tank Cleaning', fromPrice: 499, offeringCount: 4 });
  });

  it('"RO pre filter" → RO Pre-Filter Service / Replacement ₹349', async () => {
    const data = await search('RO pre filter');
    expect(data.groups[0]).toMatchObject({ title: 'RO Pre-Filter Service / Replacement', fromPrice: 349 });
  });

  it('"Electrician" → the Electrician category plus its services', async () => {
    const data = await search('Electrician');
    expect(data.categories.map((c) => c.key)).toContain('Electrician');
    expect(titles(data)).toEqual(expect.arrayContaining(['Electrician Consultation', 'Fan Installation', 'Switch Installation', 'Socket Installation']));
  });

  it('"TV installation" → LED TV Installation from ₹349', async () => {
    const data = await search('TV installation');
    expect(data.groups[0]).toMatchObject({ title: 'LED TV Installation', fromPrice: 349, offeringCount: 4 });
  });

  it('plurals and case are tolerated; unknown words find nothing', async () => {
    expect(titles(await search('FANS installation'))[0]).toBe('Fan Installation');
    expect((await search('zebra grooming')).groups).toEqual([]);
  });

  it('only bookable offerings are searched', async () => {
    await ServiceOffering.updateOne({ code: 'ELEC-FAN-INSTALL' }, { isActive: false });
    expect(titles(await search('Fan installation'))).not.toContain('Fan Installation');
  });

  it('never exposes payout or margin', async () => {
    const data = await search('installation');
    expect(JSON.stringify(data)).not.toMatch(/payout|margin/i);
  });

  it('validates the query', async () => {
    await request(app).get('/api/v1/catalog/search').expect(400);
  });
});

describe('POST /catalog/search/resolve — labels to destinations (home tiles)', () => {
  it('resolves category labels, service labels and misses in one call', async () => {
    const res = await request(app)
      .post('/api/v1/catalog/search/resolve')
      .send({ labels: ['AC repair', 'Split AC Installation', 'Foam-jet AC service', 'Electrician Service', 'Washing Machine', 'Deep Clean AC', 'Women Salon', 'Refrigerator Repair'] })
      .expect(200);
    const byLabel = Object.fromEntries(res.body.data.map((r) => [r.label, r.match]));

    // A service across AC types → AC with Repair preselected, lowest repair price.
    expect(byLabel['AC repair']).toMatchObject({ title: 'AC Repair', fromPrice: 349, deepLink: '/book/AC?svc=repair' });
    // Names a category outright → that category, lowest price in it.
    expect(byLabel['Electrician Service']).toMatchObject({ category: { key: 'Electrician' }, fromPrice: 99, deepLink: '/book/Electrician' });
    expect(byLabel['Washing Machine']).toMatchObject({ category: { key: 'Washing Machine' }, deepLink: '/book/Washing%20Machine' });
    // Only one product type offers it → that type preselected.
    expect(byLabel['Deep Clean AC']).toMatchObject({ title: 'Split AC Deep Cleaning', fromPrice: 649, deepLink: '/book/AC?pt=split&svc=deep_cleaning&offering=AC-SPLIT-DEEPCLEAN' });
    // Names a product type → that type's price, not the cheapest in the category.
    expect(byLabel['Split AC Installation']).toMatchObject({ title: 'Split AC Installation', fromPrice: 1399, deepLink: '/book/AC?pt=split&svc=installation' });
    // No service matches, but the label names a category → that category.
    expect(byLabel['Foam-jet AC service']).toMatchObject({ category: { key: 'AC' }, fromPrice: 349, deepLink: '/book/AC' });
    // Nothing bookable → null (the tile shows no price).
    expect(byLabel['Women Salon']).toBeNull();
    // Phase 8 seeded Refrigerator, so it now resolves.
    expect(byLabel['Refrigerator Repair']).toMatchObject({ title: 'Refrigerator Repair', deepLink: '/book/Refrigerator?svc=repair' });
  });
});

describe('GET /catalog/service-groups — the "all services" listing', () => {
  it('lists every bookable service once, sizes folded into a from-price', async () => {
    const res = await request(app).get('/api/v1/catalog/service-groups').expect(200);
    const byTitle = Object.fromEntries(res.body.data.map((g) => [g.title, g]));
    expect(byTitle['Split AC Installation']).toMatchObject({ fromPrice: 1399, offeringCount: 3 });
    expect(byTitle['Fan Installation']).toMatchObject({ fromPrice: 299, deepLink: '/book/Electrician?svc=fan_installation&offering=ELEC-FAN-INSTALL' });
    expect(new Set(res.body.data.map((g) => g.deepLink)).size).toBe(res.body.data.length);
    expect(JSON.stringify(res.body.data)).not.toMatch(/payout|margin/i);
  });
});

describe('search v2 — typos, synonyms, suggestions (Phase 11)', () => {
  it('forgives typos and says what it corrected', async () => {
    const data = await search('ac instalation');
    expect(titles(data)).toEqual(expect.arrayContaining(['Split AC Installation', 'Window AC Installation']));
    expect(data.didYouMean).toBe('ac installation');

    const fridge = await search('refrigrator repair');
    expect(fridge.groups[0].category.key).toBe('Refrigerator');
    expect(fridge.didYouMean).toBe('refrigerator repair');
  });

  it('understands everyday words through synonyms', async () => {
    const fridge = await search('fridge gas refill');
    expect(fridge.groups.length).toBeGreaterThan(0);
    expect(fridge.groups.every((g) => g.category.key === 'Refrigerator' && /Gas Refilling/.test(g.title))).toBe(true);
    expect(fridge.didYouMean).toBeNull();

    expect(titles(await search('television installation'))[0]).toBe('LED TV Installation');
    expect((await search('geezer')).categories.map((c) => c.key)).toContain('Geyser');
  });

  it('matches while the customer is still typing', async () => {
    expect(titles(await search('fan instal'))[0]).toBe('Fan Installation');
    expect(titles(await search('water tank clea'))[0]).toBe('Water Tank Cleaning');
  });

  it('exact results are not diluted, and nonsense still finds nothing', async () => {
    const data = await search('Fan installation');
    expect(titles(data)).toEqual(['Fan Installation']);
    expect(data.didYouMean).toBeNull();
    expect((await search('zebra grooming')).groups).toEqual([]);
    expect((await search('qwerty')).groups).toEqual([]);
  });

  it('suggests popular searches for an empty box — biggest categories when nothing is booked yet', async () => {
    const res = await request(app).get('/api/v1/catalog/search/popular').expect(200);
    expect(res.body.data.length).toBe(8);
    expect(res.body.data[0]).toEqual({ label: expect.any(String), deepLink: expect.stringMatching(/^\/book\//) });
    expect(JSON.stringify(res.body.data)).not.toMatch(/payout|margin|price/i);
  });
});
