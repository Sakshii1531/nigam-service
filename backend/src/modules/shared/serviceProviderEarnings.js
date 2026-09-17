import { RateCard } from '../brand-admin/rateCard.model.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';

// Default only — the live share is PlatformSettings.serviceProviderCommissionPercent.
const DEFAULT_TECH_EARNINGS_SHARE = 0.3; // 30% of the D2C subtotal

export async function serviceProviderShare() {
  const settings = await PlatformSettings.findOne();
  const percent = settings?.serviceProviderCommissionPercent;
  return percent != null ? percent / 100 : DEFAULT_TECH_EARNINGS_SHARE;
}

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
 * accepting it — the same rules acceptJob snapshots onto the Job. Paid
 * bookings earn the commission share; covered (₹0) work earns the rate card.
 */
export async function estimateServiceProviderEarnings(serviceRequest, booking) {
  const totalPrice = booking?.totalPrice ?? 0;
  if (totalPrice > 0) return Math.round(totalPrice * (await serviceProviderShare()));
  return coveredVisitEarnings(serviceRequest);
}
