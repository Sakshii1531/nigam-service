import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { OfferingRate } from '../src/modules/catalog/offeringRate.model.js';
import { seedMasterCatalogue } from '../scripts/seedMasterCatalogue.js';
import { CATEGORY_SEED } from '../scripts/categorySeedData.js';
import { FULL_CATALOGUE_SEED, demoRate } from '../scripts/catalogueExpansion.js';
import { MASTER_CATALOGUE_SEED } from '../scripts/masterCatalogueSeedData.js';
import { clearCatalogue } from './helpers/catalogue.js';
import { testDbUri } from './helpers/testDb.js';

// Phase 8: the seed makes every category the app shows bookable, with DEMO
// rates for everything the client hasn't priced yet — the same way seed.js
// runs it (categories first, then the Master Catalogue).

const TEST_DB_URI = testDbUri('full_catalogue_seed');
let app;
let firstRun;

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp().listen(0);
  await clearCatalogue();
  for (const entry of CATEGORY_SEED) await Category.create(entry);
  firstRun = await seedMasterCatalogue();
}, 60000);

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('full catalogue seed', () => {
  it('every active category has at least one bookable offering', async () => {
    const active = await Category.find({ isActive: true }).select('key').lean();
    expect(active.length).toBeGreaterThanOrEqual(38);
    const empty = [];
    for (const { key } of active) {
      const tree = (await request(app).get(`/api/v1/catalog/categories/${encodeURIComponent(key)}/tree`).expect(200)).body.data;
      if (tree.offerings.length === 0) empty.push(key);
    }
    expect(empty).toEqual([]);
  });

  it("keeps the client's own rates and flags every other rate as DEMO", async () => {
    const clientRates = { 'AC-SPLIT-15T-INSTALL': 1499, 'AC-WINDOW-INSTALL': 599, 'TV-LED-32-INSTALL': 349, 'TV-LED-55-65-INSTALL': 799, 'ELEC-FAN-INSTALL': 299 };
    for (const [code, price] of Object.entries(clientRates)) {
      const offering = await ServiceOffering.findOne({ code }).lean();
      expect(offering.needsRateReview).toBe(false);
      expect((await OfferingRate.findOne({ offering: offering._id }).lean()).customerPrice).toBe(price * 100);
    }
    const reviewed = await ServiceOffering.countDocuments({ needsRateReview: false });
    expect(reviewed).toBe(Object.keys(clientRates).length);
  });

  it('client Test 12 still holds: Window AC Gas Refilling / Deep Cleaning are not configured', () => {
    const ac = FULL_CATALOGUE_SEED.find((c) => c.key === 'AC');
    const windowServices = ac.offerings.filter((o) => o.productType === 'window').map((o) => o.service);
    expect(windowServices).not.toContain('gas_refilling');
    expect(windowServices).not.toContain('deep_cleaning');
  });

  it("client Test 4: no other LED TV service costs ₹349 (the 32\" install price must never appear for 55–65\")", () => {
    const tv = FULL_CATALOGUE_SEED.find((c) => c.key === 'TV');
    expect(tv.offerings.filter((o) => o.rate.customerPrice === 349).map((o) => o.code)).toEqual(['TV-LED-32-INSTALL']);
  });

  it('generated DEMO rates are deterministic and sane (price ends in 9, payout 55–65 %)', () => {
    expect(demoRate('X-CODE', 500)).toEqual(demoRate('X-CODE', 500));
    const handBuilt = new Set(MASTER_CATALOGUE_SEED.flatMap((c) => c.offerings).map((o) => o.code));
    const generated = FULL_CATALOGUE_SEED.flatMap((c) => c.offerings).filter((o) => !handBuilt.has(o.code));
    expect(generated.length).toBeGreaterThan(150);
    for (const offering of generated) {
      const { customerPrice, spPayout } = offering.rate;
      expect(customerPrice % 10).toBe(9);
      expect(spPayout / customerPrice).toBeGreaterThan(0.5);
      expect(spPayout / customerPrice).toBeLessThan(0.7);
    }
  });

  it('is idempotent — a second run adds nothing and rewrites no rate', async () => {
    const offerings = await ServiceOffering.countDocuments();
    const rates = await OfferingRate.countDocuments();
    const again = await seedMasterCatalogue();
    expect(again.ratesCreated).toBe(0);
    expect(again.offerings).toBe(firstRun.offerings);
    expect(await ServiceOffering.countDocuments()).toBe(offerings);
    expect(await OfferingRate.countDocuments()).toBe(rates);
  });

  it('the duplicate "TV Installation" category is hidden (TV → Installation covers it)', async () => {
    expect((await Category.findOne({ key: 'TV Installation' })).isActive).toBe(false);
  });
});
