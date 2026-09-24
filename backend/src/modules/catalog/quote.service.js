import { Variant } from './variant.model.js';
import { loadBookableOfferings, platformPricingSettings } from './offeringBrowse.service.js';
import { priceQuote } from './offeringPricing.js';
import { toPaise } from './money.js';
import { catalogError, CATALOG_ERROR_CODES } from './catalogErrors.js';
import { resolveCoupon } from '../rewards-loyalty/coupon.service.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { detectWarrantyForAppliance } from '../warranty-amc-exchange/warrantyDetector.service.js';

// Loads everything a price depends on — the offerings (bookable right now,
// for this location), their active rates, the variant the customer picked,
// platform GST/advance/coin settings, coupon, wallet — and hands it to the
// pure engine. Used by POST /catalog/quote and, from Phase 4, by
// createBooking, so the price a customer is shown and the price a booking is
// saved at come from the same code.
//
// Coverage is never something the customer declares — a request that could
// say "I'm covered" would price anything at ₹0. The customer only supplies
// their appliance details (`warranty`: brand / appliance / serial / purchase
// date) and, for a signed-in customer, the server runs the same warranty
// detection the booking engine runs. So a covered customer sees ₹0 on every
// screen before confirming, and the booking prices identically.

/** Warranty detector status → the coverage the pricing engine applies (A5). */
export const COVERAGE_BY_WARRANTY_STATUS = Object.freeze({
  'In Warranty': 'Brand Warranty',
  AMC: 'AMC Visit',
  'Extended Warranty': 'NCC Extended Warranty',
});

/**
 * Runs warranty/AMC/EW detection for a customer's appliance in a category.
 * Returns the coverage type (or null) plus the raw detection, which the
 * booking engine also needs (brand, appliance, AMC/EW references).
 */
export async function detectCoverage({ userId, categoryKey, warranty = {} }) {
  if (!userId) return { coverageType: null, detection: null };
  const detection = await detectWarrantyForAppliance({
    userId,
    category: categoryKey,
    brandName: warranty.brand,
    serialNo: warranty.serialNo,
    purchaseDate: warranty.purchaseDate,
    applianceId: warranty.applianceId,
  });
  return { coverageType: COVERAGE_BY_WARRANTY_STATUS[detection.warrantyStatus] || null, detection };
}

const { OFFERING_NOT_BOOKABLE, VARIANT_REQUIRED, VARIANT_MISMATCH, COUPON_INVALID } = CATALOG_ERROR_CODES;

const notBookable = (offeringId) =>
  catalogError(OFFERING_NOT_BOOKABLE, 'This service is not available right now.', 400, { offeringId });

/**
 * The variant the customer is booking. A variant-specific offering fixes it;
 * a variant-agnostic one (e.g. AC-SPLIT-UNINSTALL) needs the customer's pick
 * when the product type / service has variants — and if that pick has its
 * own specific offering for the same service, the specific one must be used.
 */
async function resolveSelectedVariant(offering, variantId, loc) {
  if (offering.variant) {
    if (variantId && variantId !== String(offering.variant._id)) {
      throw catalogError(VARIANT_MISMATCH, 'The selected size/option does not match this service.');
    }
    return offering.variant;
  }

  const parentField = offering.bookingType === 'PRODUCT_LINKED' ? 'productType' : 'service';
  const variants = await Variant.find({ [parentField]: offering[parentField]._id, isActive: true }).lean();
  if (!variants.length) {
    if (variantId) throw catalogError(VARIANT_MISMATCH, 'This service has no size/option to choose.');
    return null;
  }
  if (!variantId) {
    throw catalogError(VARIANT_REQUIRED, 'Please choose a size/option for this service.', 400, {
      variants: variants.map((v) => ({ id: String(v._id), label: v.label })),
    });
  }
  const selected = variants.find((v) => String(v._id) === variantId);
  if (!selected) throw catalogError(VARIANT_MISMATCH, 'The selected size/option does not match this service.');

  const [specific] = await loadBookableOfferings(
    { service: offering.service._id, productType: offering.productType?._id ?? null, variant: selected._id },
    loc,
  );
  if (specific) {
    throw catalogError(VARIANT_MISMATCH, `Use ${specific.offering.code} for ${selected.label}.`, 400, {
      offeringId: String(specific.offering._id),
      offeringCode: specific.offering.code,
    });
  }
  return selected;
}

async function couponPaise(couponCode) {
  if (!couponCode) return 0;
  try {
    const coupon = await resolveCoupon(couponCode, 'service');
    return toPaise(coupon.discount);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode < 500) throw catalogError(COUPON_INVALID, err.message);
    throw err;
  }
}

async function walletPaise(userId, coinsPerRupee) {
  const user = await User.findById(userId).select('walletCoins').lean();
  return Math.floor(((user?.walletCoins || 0) * 100) / coinsPerRupee);
}

/**
 * Internal quote — integer paise, including partner payout and NCC margin.
 * Never send this to a customer as-is; use commercialView.toCustomerQuote().
 *
 * @param {object} input  { lines: [{ offeringId, variantId?, quantity, isExpress? }], couponCode?, useCoins?, paymentMode?, location?, warranty? }
 * @param {object} ctx    { userId?, coverageType?, at? } — pass coverageType when the caller already
 *                        ran detectCoverage (the booking engine); otherwise it's detected here from
 *                        `input.warranty` for a signed-in customer.
 */
export async function buildQuote(input, { userId = null, coverageType: knownCoverage, at = new Date() } = {}) {
  const loc = { at, city: input.location?.city || null, pincode: input.location?.pincode || null };
  const ids = [...new Set(input.lines.map((line) => line.offeringId))];
  const bookable = new Map(
    (await loadBookableOfferings({ _id: { $in: ids } }, loc)).map((entry) => [String(entry.offering._id), entry]),
  );

  const selections = [];
  for (const line of input.lines) {
    const entry = bookable.get(line.offeringId);
    if (!entry) throw notBookable(line.offeringId);
    const variant = await resolveSelectedVariant(entry.offering, line.variantId || null, loc);
    selections.push({ ...entry, variant, quantity: line.quantity, isExpress: Boolean(line.isExpress) });
  }

  const coverageType = knownCoverage !== undefined
    ? knownCoverage
    : input.warranty
      ? (await detectCoverage({ userId, categoryKey: selections[0].offering.category.key, warranty: input.warranty })).coverageType
      : null;

  const settings = await platformPricingSettings();
  const paymentMode = input.paymentMode || 'after';
  const [coupon, coinsAvailablePaise] = await Promise.all([
    couponPaise(input.couponCode),
    input.useCoins && userId ? walletPaise(userId, settings.coinsPerRupee) : 0,
  ]);

  const priced = priceQuote({
    lines: selections.map(({ offering, rate, quantity, isExpress }) => ({ offering, rate, quantity, isExpress })),
    couponPaise: coupon,
    coverageType,
    defaultGstPercent: settings.defaultGstPercent,
    advancePercent: settings.advancePercent,
    paymentMode,
    coinsAvailablePaise,
  });

  return {
    ...priced,
    lines: priced.lines.map((line, i) => {
      const { offering, rate, variant } = selections[i];
      return {
        ...line,
        offering: {
          id: String(offering._id),
          code: offering.code,
          name: offering.name,
          bookingType: offering.bookingType,
          pricingUnit: offering.pricingUnit,
          unitLabel: offering.unitLabel,
        },
        category: { key: offering.category.key, name: offering.category.name },
        productType: offering.productType ? { id: String(offering.productType._id), name: offering.productType.name } : null,
        variant: variant ? { id: String(variant._id), label: variant.label } : null,
        service: { id: String(offering.service._id), name: offering.service.name },
        rate: { id: String(rate._id), version: rate.version, scope: rate.scope.type },
      };
    }),
    couponCode: input.couponCode ? input.couponCode.toUpperCase() : null,
    coinsToRedeem: Math.ceil((priced.coinsApplied * settings.coinsPerRupee) / 100),
    paymentMode,
    pricedAt: at,
  };
}
