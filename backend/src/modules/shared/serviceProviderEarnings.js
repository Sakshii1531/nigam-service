import { initialJobPayout } from './servicePartnerPayout.js';
import { RateCard } from '../brand-admin/rateCard.model.js';

// Covered work (Brand Warranty / AMC / EW) is priced from the brand's RateCard
// for that appliance category. This used to be a flat 150 because no RateCard
// existed; it does now, so the flat value is only the fallback for a brand that
// has not configured a card for the category.
const DEFAULT_COVERED_VISIT_EARNINGS = 150;

export async function coveredVisitEarnings(serviceRequest) {
  if (!serviceRequest?.brand || !serviceRequest?.category) return DEFAULT_COVERED_VISIT_EARNINGS;
  const card = await RateCard.findOne({ brand: serviceRequest.brand, category: serviceRequest.category });
  return card?.laborRate ?? DEFAULT_COVERED_VISIT_EARNINGS;
}

/**
 * What the service provider should expect to earn from a request before
 * accepting it — the same rule acceptJob freezes onto the Job: the booking's
 * fixed catalogue payout (docs/master-catalogue Phase 5), or the brand
 * RateCard for a complaint with no booking.
 */
export async function estimateServiceProviderEarnings(serviceRequest, booking) {
  return (await initialJobPayout(serviceRequest, booking)).total;
}
