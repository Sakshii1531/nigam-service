import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { Variant } from '../src/modules/catalog/variant.model.js';
import { CatalogService } from '../src/modules/catalog/catalogService.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { OfferingRate } from '../src/modules/catalog/offeringRate.model.js';
import { buildOfferingCode, suggestOfferingCode } from '../src/modules/catalog/offeringCode.js';
import { seedTestCatalogue } from './helpers/catalogue.js';
import { FULL_CATALOGUE_SEED } from '../scripts/catalogueExpansion.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('catalog_models');

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all(
    [Category, ProductType, Variant, CatalogService, ServiceOffering, OfferingRate].map((model) => model.deleteMany({})),
  );
});

async function acFixture() {
  const ac = await Category.create({ key: 'AC', name: 'AC' });
  const tv = await Category.create({ key: 'TV', name: 'TV' });
  const split = await ProductType.create({ category: ac._id, slug: 'split', name: 'Split AC', variantDimension: { key: 'capacity', label: 'Capacity' } });
  const window = await ProductType.create({ category: ac._id, slug: 'window', name: 'Window AC' });
  const ton15 = await Variant.create({ category: ac._id, productType: split._id, slug: '15t', label: '1.5 Ton' });
  const install = await CatalogService.create({ category: ac._id, slug: 'installation', name: 'Installation' });
  const tvInstall = await CatalogService.create({ category: tv._id, slug: 'installation', name: 'Installation' });
  return { ac, tv, split, window, ton15, install, tvInstall };
}

function offering(overrides) {
  return new ServiceOffering({ name: 'Test offering', bookingType: 'PRODUCT_LINKED', ...overrides });
}

describe('Variant', () => {
  it('needs exactly one parent', async () => {
    const { ac, split, install } = await acFixture();
    await expect(Variant.create({ category: ac._id, slug: 'x', label: 'X' })).rejects.toThrow(/exactly one/);
    await expect(
      Variant.create({ category: ac._id, productType: split._id, service: install._id, slug: 'y', label: 'Y' }),
    ).rejects.toThrow(/exactly one/);
  });

  it('allows the same slug under different parents but not the same parent', async () => {
    const { ac, split, window } = await acFixture();
    await Variant.create({ category: ac._id, productType: window._id, slug: '15t', label: '1.5 Ton' });
    await expect(Variant.create({ category: ac._id, productType: split._id, slug: '15t', label: 'dup' })).rejects.toThrow(/duplicate key/);
  });
});

describe('ServiceOffering consistency', () => {
  it('saves a valid product-linked offering and builds its search text', async () => {
    const { ac, split, ton15, install } = await acFixture();
    const saved = await offering({
      code: 'ac-split-15t-install', category: ac._id, productType: split._id, variant: ton15._id, service: install._id,
    }).save();
    expect(saved.code).toBe('AC-SPLIT-15T-INSTALL');
    expect(saved.searchText).toContain('split ac');
    expect(saved.searchText).toContain('1.5 ton');
    expect(saved.searchText).toContain('installation');
  });

  it('rejects a standalone offering that names a product type', async () => {
    const { ac, split, install } = await acFixture();
    await expect(
      offering({ code: 'X-1', bookingType: 'STANDALONE', category: ac._id, productType: split._id, service: install._id }).save(),
    ).rejects.toThrow(/standalone offering cannot have a product type/);
  });

  it('rejects a product-linked offering without a product type', async () => {
    const { ac, install } = await acFixture();
    await expect(offering({ code: 'X-2', category: ac._id, service: install._id }).save()).rejects.toThrow(/needs a product type/);
  });

  it('rejects a variant from another product type', async () => {
    const { ac, window, ton15, install } = await acFixture();
    await expect(
      offering({ code: 'X-3', category: ac._id, productType: window._id, variant: ton15._id, service: install._id }).save(),
    ).rejects.toThrow(/does not belong to this product type/);
  });

  it('rejects a service from another category', async () => {
    const { ac, window, tvInstall } = await acFixture();
    await expect(
      offering({ code: 'X-4', category: ac._id, productType: window._id, service: tvInstall._id }).save(),
    ).rejects.toThrow(/different category/);
  });

  it('allows only one offering per (service, product type, variant)', async () => {
    const { ac, window, install } = await acFixture();
    await offering({ code: 'AC-WINDOW-INSTALL', category: ac._id, productType: window._id, service: install._id }).save();
    await expect(
      offering({ code: 'AC-WINDOW-INSTALL-2', category: ac._id, productType: window._id, service: install._id }).save(),
    ).rejects.toThrow(/duplicate key/);
  });

  it('makes the code immutable after creation', async () => {
    const { ac, window, install } = await acFixture();
    const saved = await offering({ code: 'AC-WINDOW-INSTALL', category: ac._id, productType: window._id, service: install._id }).save();
    saved.code = 'AC-WINDOW-FIT';
    await expect(saved.save()).rejects.toThrow(/cannot be changed/);
    await expect(ServiceOffering.updateOne({ _id: saved._id }, { $set: { code: 'NEW' } })).rejects.toThrow(/cannot be changed/);
  });

  it('forces quantity 1 for per-service pricing and checks min ≤ max', async () => {
    const { ac, window, install } = await acFixture();
    const perService = await offering({
      code: 'AC-WINDOW-INSTALL', category: ac._id, productType: window._id, service: install._id,
      pricingUnit: 'PER_SERVICE', minQty: 2, maxQty: 5,
    }).save();
    expect([perService.minQty, perService.maxQty]).toEqual([1, 1]);

    await expect(
      offering({ code: 'X-5', category: ac._id, productType: window._id, service: install._id, minQty: 5, maxQty: 2 }).validate(),
    ).rejects.toThrow(/cannot be less than minimum/);
  });
});

describe('offering code suggestion', () => {
  it('matches the client naming style', () => {
    expect(buildOfferingCode({ category: 'AC', productType: 'Split AC', variant: '1.5 Ton', service: 'Installation' })).toBe('AC-SPLIT-15T-INSTALL');
    expect(buildOfferingCode({ category: 'AC', productType: 'Window AC', service: 'Installation' })).toBe('AC-WINDOW-INSTALL');
    expect(buildOfferingCode({ category: 'TV', productType: 'LED TV', variant: '55–65 inch', service: 'Installation' })).toBe('TV-LED-55-65-INSTALL');
    expect(buildOfferingCode({ category: 'Electrician', service: 'Fan Installation' })).toBe('ELEC-FAN-INSTALL');
  });

  it('suffixes a code that is already taken', async () => {
    const { ac, window, install } = await acFixture();
    await offering({ code: 'AC-WINDOW-INSTALL', category: ac._id, productType: window._id, service: install._id }).save();
    await expect(suggestOfferingCode({ category: 'AC', productType: 'Window AC', service: 'Installation' })).resolves.toBe('AC-WINDOW-INSTALL-2');
  });
});

describe('master catalogue seed', () => {
  it('seeds every offering with exactly one v1 rate each, idempotently', async () => {
    const first = await seedTestCatalogue();
    const expected = FULL_CATALOGUE_SEED.flatMap((c) => c.offerings).length;
    expect(first).toEqual({ categories: FULL_CATALOGUE_SEED.length, offerings: expected, ratesCreated: expected });

    const second = await seedTestCatalogue();
    expect(second.ratesCreated).toBe(0);

    expect(await ServiceOffering.countDocuments()).toBe(expected);
    expect(await OfferingRate.countDocuments()).toBe(expected);
    const perOffering = await OfferingRate.aggregate([{ $group: { _id: '$offering', n: { $sum: 1 } } }, { $match: { n: { $ne: 1 } } }]);
    expect(perOffering).toHaveLength(0);
  });

  it('stores the client rates in paise and flags only DEMO rates for review', async () => {
    await seedTestCatalogue();
    const expected = {
      'AC-SPLIT-15T-INSTALL': [149900, 90000],
      'AC-WINDOW-INSTALL': [59900, 35000],
      'TV-LED-32-INSTALL': [34900, 20000],
      'TV-LED-55-65-INSTALL': [79900, 45000],
      'ELEC-FAN-INSTALL': [29900, 18000],
    };
    for (const [code, [price, payout]] of Object.entries(expected)) {
      const o = await ServiceOffering.findOne({ code });
      const rate = await OfferingRate.findOne({ offering: o._id });
      expect([code, rate.customerPrice, rate.spPayout, o.needsRateReview]).toEqual([code, price, payout, false]);
    }
    expect((await ServiceOffering.findOne({ code: 'CLEAN-TANK-1000L' })).needsRateReview).toBe(true);
  });

  it('models standalone services, options and variant-agnostic offerings', async () => {
    await seedTestCatalogue();
    const fan = await ServiceOffering.findOne({ code: 'ELEC-FAN-INSTALL' });
    expect([fan.bookingType, fan.productType]).toEqual(['STANDALONE', null]);

    const tank = await ServiceOffering.findOne({ code: 'CLEAN-TANK-1000L' }).populate('variant');
    expect([tank.bookingType, tank.variant.label]).toEqual(['STANDALONE', '501–1000 L']);

    const uninstall = await ServiceOffering.findOne({ code: 'AC-SPLIT-UNINSTALL' });
    expect([uninstall.bookingType, uninstall.variant]).toEqual(['PRODUCT_LINKED', null]);

    const consult = await ServiceOffering.findOne({ code: 'ELEC-CONSULT' });
    expect([consult.minQty, consult.maxQty, consult.express.enabled]).toEqual([1, 1, false]);
  });

  it('leaves the Test 12 combinations unconfigured', async () => {
    await seedTestCatalogue();
    const window = await ProductType.findOne({ slug: 'window' });
    const gas = await CatalogService.findOne({ slug: 'gas_refilling' });
    const deepClean = await CatalogService.findOne({ slug: 'deep_cleaning' });
    expect(await ServiceOffering.exists({ productType: window._id, service: { $in: [gas._id, deepClean._id] } })).toBeNull();
  });
});
