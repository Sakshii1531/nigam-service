import { apiRequest } from './apiClient';

/** One /bookings POST body for a single appliance type entry within a
 * bookingMeta (BookingFlow's Step 4 handoff object). `extra` carries
 * call-site-specific fields, e.g. { paymentMethod: 'Card' }. */
function buildBookingBody(meta, typeEntry, extra) {
  return {
    category: meta.category,
    productType: typeEntry.name,
    quantity: typeEntry.qty || 1,
    serviceSlug: meta.serviceSlug,
    serviceName: meta.serviceName || meta.service || meta.serviceSlug,
    service: meta.service || meta.serviceName || meta.serviceSlug,
    brand: meta.brand,
    scheduledDate: new Date().toISOString(),
    timeSlot: { date: meta.date || '', time: meta.timeGroup || '' },
    address: meta.address,
    fullName: meta.fullName,
    mobile: meta.mobile,
    paymentMode: meta.paymentMode || 'after',
    isInstant: meta.isInstant,
    timeGroup: meta.timeGroup,
    ...extra,
  };
}

/**
 * The customer may need service for more than one appliance type in the same
 * visit (e.g. 1 Window AC + 2 Split AC) — a Booking is one type's service
 * call, so this creates one booking per type entry, sequentially, sharing
 * the same service/schedule/address/payment mode. `meta.typeEntries` is the
 * `[{ name, qty }, ...]` list BookingFlow's Step 1 builds (falls back to the
 * single productType/quantity pair for a plain one-type booking).
 *
 * This is the one place that builds a /bookings request — BookingFlow's
 * pay-after-service path and each gateway payment page (Card/UPI/
 * NetBanking) used to each independently duplicate this payload, which is
 * exactly the kind of place a multi-type change is easy to apply in three
 * places and miss the fourth.
 *
 * `onEach(result, typeEntry)` runs after each booking is created — e.g. to
 * collect that booking's Razorpay advance before moving to the next one.
 */
export async function submitBookingsForMeta(meta, { extra = {}, onEach } = {}) {
  const typeEntries = Array.isArray(meta.typeEntries) && meta.typeEntries.length > 0
    ? meta.typeEntries
    : [{ name: meta.productType, qty: meta.quantity || 1 }];

  const results = [];
  for (const entry of typeEntries) {
    const result = await apiRequest('/bookings', {
      method: 'POST',
      auth: true,
      body: buildBookingBody(meta, entry, extra),
    });
    if (onEach) await onEach(result, entry);
    results.push(result);
  }
  return results;
}

/** Sum of what every booking in the result set actually charged — the
 * authoritative, server-computed total (addons included), not a client
 * estimate. */
export function totalPriceFromResults(results) {
  return results.reduce((sum, r) => sum + (r.booking?.totalPrice || 0), 0);
}
