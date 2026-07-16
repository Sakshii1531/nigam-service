// Pure computation, no DB access — callers (OwnedAppliance service, Booking/ServiceRequest
// creation, the customer dashboard warranty-check modal) resolve the AMC/EW overlay docs
// themselves and pass in plain flags, so this stays trivially unit-testable.

export const DEFAULT_BRAND_WARRANTY_MONTHS = 12;

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function isWithinBrandWarranty(purchaseDate, warrantyMonths = DEFAULT_BRAND_WARRANTY_MONTHS) {
  if (!purchaseDate) return false;
  const expiry = addMonths(purchaseDate, warrantyMonths);
  return Date.now() <= expiry.getTime();
}

/**
 * Computes OwnedAppliance.warrantyStatus. Precedence: an active Extended Warranty
 * overlay wins over AMC, which wins over the base brand warranty — matches how the
 * frontend's technician job `type` field prioritizes NCC Extended Warranty / AMC
 * Visit jobs over plain brand-warranty ones (BACKEND_CONTEXT.md §4.2).
 */
export function computeWarrantyStatus({
  purchaseDate,
  brandWarrantyMonths = DEFAULT_BRAND_WARRANTY_MONTHS,
  amcActive = false,
  extendedWarrantyActive = false,
  extendedWarrantyValidTill = null,
} = {}) {
  const ewStillValid = !extendedWarrantyValidTill || Date.now() <= new Date(extendedWarrantyValidTill).getTime();
  if (extendedWarrantyActive && ewStillValid) return 'Extended Warranty';
  if (amcActive) return 'AMC';
  return isWithinBrandWarranty(purchaseDate, brandWarrantyMonths) ? 'In Warranty' : 'Out of Warranty';
}
