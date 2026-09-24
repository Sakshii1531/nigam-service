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
import { createRateVersion, findLatestRate } from '../src/modules/catalog/rateWriter.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('rate_writer');

const V1 = { customerPrice: 79900, spPayout: 45000, expressFee: 9900, expressSpIncentive: 5000 };
let offeringId;

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
  const tv = await Category.create({ key: 'TV', name: 'TV' });
  const led = await ProductType.create({ category: tv._id, slug: 'led', name: 'LED TV' });
  const size = await Variant.create({ category: tv._id, productType: led._id, slug: '55-65', label: '55–65 inch' });
  const install = await CatalogService.create({ category: tv._id, slug: 'installation', name: 'Installation' });
  const offering = await ServiceOffering.create({
    code: 'TV-LED-55-65-INSTALL', name: 'LED TV 55–65 inch Installation', bookingType: 'PRODUCT_LINKED',
    category: tv._id, productType: led._id, variant: size._id, service: install._id, needsRateReview: true,
  });
  offeringId = offering._id;
});

describe('createRateVersion', () => {
  it('creates v1 only with every amount', async () => {
    await expect(createRateVersion(offeringId, { customerPrice: 79900 })).rejects.toThrow(/missing spPayout/);
    const v1 = await createRateVersion(offeringId, V1);
    expect([v1.version, v1.customerPrice, v1.spPayout, v1.changes]).toEqual([1, 79900, 45000, []]);
  });

  it('client Test 8 — changing the customer price carries the payout forward unchanged', async () => {
    const v1 = await createRateVersion(offeringId, V1);
    const v2 = await createRateVersion(offeringId, { customerPrice: 89900 }, { reason: 'Festive pricing' });

    expect(v2.version).toBe(2);
    expect(v2.customerPrice).toBe(89900);
    expect(v2.spPayout).toBe(45000);
    expect(v2.expressFee).toBe(9900);
    expect(v2.changes.map((c) => c.toObject())).toEqual([{ field: 'customerPrice', from: 79900, to: 89900 }]);
    expect(v2.reason).toBe('Festive pricing');

    const closed = await OfferingRate.findById(v1._id);
    expect(closed.effectiveUntil.getTime()).toBe(v2.effectiveFrom.getTime());
    expect((await findLatestRate(offeringId)).id).toBe(v2.id);
  });

  it('records old and new values when the payout itself is changed', async () => {
    await createRateVersion(offeringId, V1);
    const v2 = await createRateVersion(offeringId, { spPayout: 48000 }, { reason: 'Partner rate revision' });
    expect(v2.customerPrice).toBe(79900);
    expect(v2.changes.map((c) => c.toObject())).toEqual([{ field: 'spPayout', from: 45000, to: 48000 }]);
  });

  it('requires a reason and a real change after v1', async () => {
    await createRateVersion(offeringId, V1);
    await expect(createRateVersion(offeringId, { customerPrice: 89900 })).rejects.toThrow(/reason is required/);
    await expect(createRateVersion(offeringId, { customerPrice: 79900 }, { reason: 'x' })).rejects.toThrow(/Nothing changed/);
  });

  it('rejects non-paise amounts and unknown fields', async () => {
    await expect(createRateVersion(offeringId, { ...V1, customerPrice: 799.5 })).rejects.toThrow(/whole number of paise/);
    await expect(createRateVersion(offeringId, { ...V1, margin: 100 })).rejects.toThrow(/Not a rate field/);
  });

  it('does not let a new version start before the current one', async () => {
    await createRateVersion(offeringId, V1, { effectiveFrom: new Date('2026-10-01') });
    await expect(
      createRateVersion(offeringId, { customerPrice: 89900 }, { reason: 'x', effectiveFrom: new Date('2026-09-01') }),
    ).rejects.toThrow(/cannot take effect before/);
  });

  it('supports a future-dated change', async () => {
    await createRateVersion(offeringId, V1, { effectiveFrom: new Date('2026-10-01') });
    const v2 = await createRateVersion(offeringId, { customerPrice: 89900 }, { reason: 'Winter', effectiveFrom: new Date('2026-12-01') });
    expect(v2.effectiveFrom.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('clears the DEMO review flag when a real rate is saved', async () => {
    await createRateVersion(offeringId, V1, { needsRateReview: true });
    expect((await ServiceOffering.findById(offeringId)).needsRateReview).toBe(true);
    await createRateVersion(offeringId, { customerPrice: 84900 }, { reason: 'Client rate sheet' });
    expect((await ServiceOffering.findById(offeringId)).needsRateReview).toBe(false);
  });

  it('keeps versions separate per scope (location pricing seam)', async () => {
    await createRateVersion(offeringId, V1);
    const city = await createRateVersion(offeringId, { ...V1, customerPrice: 74900 }, { scope: { type: 'CITY', value: 'Jaipur' } });
    expect([city.version, city.scope.type, city.scope.value]).toEqual([1, 'CITY', 'Jaipur']);
    expect((await findLatestRate(offeringId)).customerPrice).toBe(79900);
  });
});
