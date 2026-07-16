import { GST_PERCENT_DEFAULT } from '../../config/constants.js';

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Computes a charge breakdown from resolved inputs (a RateCard/ServiceCatalogItem's
 * laborRate + partsMarkupPercent, plus whatever parts/extras a technician added
 * during diagnosis) — pure function, no DB access. GST defaults to 18% flat
 * everywhere (GST_PERCENT_DEFAULT) — confirmed by the user; the frontend's 10%
 * sighting (BACKEND_CONTEXT.md §9) was mock-data inconsistency, not a real second rate.
 */
export function computeCharges({
  laborRate = 0,
  partsCost = 0,
  partsMarkupPercent = 0,
  additionalCharges = 0,
  gstPercent = GST_PERCENT_DEFAULT,
} = {}) {
  const partsTotal = round2(partsCost + (partsCost * partsMarkupPercent) / 100);
  const subtotal = round2(laborRate + partsTotal + additionalCharges);
  const gstAmount = round2((subtotal * gstPercent) / 100);
  const total = round2(subtotal + gstAmount);

  return { laborRate, partsTotal, additionalCharges, subtotal, gstPercent, gstAmount, total };
}

/** Finds the RateCard matching a brand+category+serviceType, or null (caller falls back to ServiceCatalogItem default pricing). */
export function resolveRateCard(rateCards, { brand, category, serviceType }) {
  return (
    rateCards.find(
      (rc) => String(rc.brand) === String(brand) && rc.category === category && rc.serviceType === serviceType,
    ) || null
  );
}
