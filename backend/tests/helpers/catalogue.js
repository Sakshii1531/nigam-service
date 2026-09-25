import { Category } from '../../src/modules/catalog/category.model.js';
import { ProductType } from '../../src/modules/catalog/productType.model.js';
import { Variant } from '../../src/modules/catalog/variant.model.js';
import { CatalogService } from '../../src/modules/catalog/catalogService.model.js';
import { ServiceOffering } from '../../src/modules/catalog/serviceOffering.model.js';
import { OfferingRate } from '../../src/modules/catalog/offeringRate.model.js';
import { createRateVersion } from '../../src/modules/catalog/rateWriter.js';
import { buildQuote } from '../../src/modules/catalog/quote.service.js';
import { toPaise, toRupees } from '../../src/modules/catalog/money.js';
import { seedMasterCatalogue } from '../../scripts/seedMasterCatalogue.js';
import { FULL_CATALOGUE_SEED } from '../../scripts/catalogueExpansion.js';

/** The categories the master-catalogue seed expects to already exist (seed.js creates them in real runs). */
export async function createCatalogueCategories() {
  await Promise.all(
    FULL_CATALOGUE_SEED.filter((entry) => !entry.create).map((entry) =>
      Category.updateOne({ key: entry.key }, { $setOnInsert: { key: entry.key, name: entry.key } }, { upsert: true }),
    ),
  );
}

/** Full master catalogue (every category, v1 rates) in the current test database. */
export async function seedTestCatalogue() {
  await createCatalogueCategories();
  return seedMasterCatalogue();
}

/** Empties every catalogue collection (legacy categories and product types included). */
export async function clearCatalogue() {
  await Promise.all([Category, ProductType, Variant, CatalogService, ServiceOffering, OfferingRate].map((m) => m.deleteMany({})));
}

/**
 * One minimal standalone offering, for tests about something other than the
 * catalogue (assignment, jobs, payments…) that just need a bookable job at a
 * known price. GST defaults to 0 so the booking total equals `price`, keeping
 * those tests' downstream arithmetic unchanged.
 */
export async function seedSimpleOffering({
  categoryKey = 'AC',
  code = 'TEST-REPAIR',
  serviceName = 'Repair',
  price = 1000,
  payout = 300,
  gstPercent = 0,
  maxQty = 5,
  express = { enabled: true, fee: 0, spIncentive: 0 },
} = {}) {
  const category =
    (await Category.findOne({ key: categoryKey })) || (await Category.create({ key: categoryKey, name: categoryKey }));
  const slug = serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const service =
    (await CatalogService.findOne({ category: category._id, slug })) ||
    (await CatalogService.create({ category: category._id, slug, name: serviceName }));
  const offering = await ServiceOffering.create({
    code,
    name: serviceName,
    bookingType: 'STANDALONE',
    category: category._id,
    service: service._id,
    unitLabel: 'per unit',
    minQty: 1,
    maxQty,
    express: { enabled: express.enabled },
    tax: { gstPercent },
  });
  await createRateVersion(offering._id, {
    customerPrice: toPaise(price),
    spPayout: toPaise(payout),
    expressFee: toPaise(express.fee || 0),
    expressSpIncentive: toPaise(express.spIncentive || 0),
  });
  return offering;
}

/**
 * A valid POST /bookings body for an offering code, with `expectedFinalAmount`
 * computed by the real pricing engine — exactly what the customer app sends
 * after showing the quote. `variant` is a variant label ("1.5 Ton");
 * `coverageType` mirrors a warranty-covered booking; every other option is
 * passed through to the request body (address, paymentMode, …).
 */
export async function offeringBooking(code, { quantity = 1, variant = null, isExpress, couponCode, useCoins, userId, coverageType = null, ...rest } = {}) {
  const offering = await ServiceOffering.findOne({ code });
  if (!offering) throw new Error(`offeringBooking: no offering ${code}`);
  const variantId = variant ? String((await Variant.findOne({ label: variant }))._id) : null;
  const isInstant = Boolean(rest.isInstant || rest.timeGroup === 'ASAP');
  const quote = await buildQuote(
    {
      lines: [{ offeringId: String(offering._id), variantId, quantity, isExpress: Boolean(isExpress || isInstant) }],
      couponCode,
      useCoins,
      paymentMode: rest.paymentMode,
      location: { city: rest.address?.city || null, pincode: rest.address?.pincode || null },
    },
    { userId, coverageType },
  );
  return {
    offeringId: String(offering._id),
    ...(variantId ? { variantId } : {}),
    quantity,
    ...(isExpress !== undefined ? { isExpress } : {}),
    ...(couponCode ? { couponCode } : {}),
    ...(useCoins !== undefined ? { useCoins } : {}),
    expectedFinalAmount: toRupees(quote.lines[0].finalAmount),
    ...rest,
  };
}
