import { apiRequest } from './apiClient';

/**
 * One /bookings POST body for a single quote line of a bookingMeta
 * (BookingFlow's Step 4 handoff). Everything commercial comes from the quote
 * the customer was shown: the offering, its size/option, quantity, express,
 * and `expectedFinalAmount` — if the server prices it differently (the rate
 * changed meanwhile) the booking is refused with 409 PRICE_CHANGED rather
 * than charged at a price the customer never saw. Coupon and coins ride on
 * the first line only (they're single-line in the flow). `extra` carries
 * call-site fields, e.g. { paymentMethod: 'Card' }.
 */
function buildBookingBody(meta, line, index, extra) {
  return {
    offeringId: line.offeringId,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    quantity: line.quantity,
    isExpress: Boolean(line.isExpress),
    expectedFinalAmount: line.expectedFinalAmount,
    requiredInfo: meta.requiredInfo || [],
    ...(index === 0 && meta.couponCode ? { couponCode: meta.couponCode } : {}),
    ...(index === 0 && meta.useCoins ? { useCoins: true } : {}),
    brand: meta.brand || undefined,
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
 * Creates one booking per quote line, sequentially — a Booking is one
 * offering's service call, so "1 Window AC + 2 Split AC" is two bookings
 * sharing the schedule, address and payment mode.
 *
 * This is the one place that builds a /bookings request — BookingFlow's
 * pay-after-service path and each gateway payment page (Card/UPI/NetBanking)
 * all go through it.
 *
 * `onEach(result, line)` runs after each booking is created — e.g. to collect
 * that booking's Razorpay advance before moving to the next one.
 */
export async function submitBookingsForMeta(meta, { extra = {}, onEach } = {}) {
  if (!Array.isArray(meta?.lines) || meta.lines.length === 0) {
    throw new Error('Nothing to book — please choose the service again.');
  }
  const results = [];
  for (const [index, line] of meta.lines.entries()) {
    const result = await apiRequest('/bookings', {
      method: 'POST',
      auth: true,
      body: buildBookingBody(meta, line, index, extra),
    });
    if (onEach) await onEach(result, line);
    results.push(result);
  }
  return results;
}

/** Sum of what every booking in the result set actually charged — the
 * authoritative, server-computed totals. Summed in whole paise so two
 * bookings of ₹706.82 + ₹411.82 read ₹1,118.64, not 1118.6399999. */
export function totalPriceFromResults(results) {
  const paise = results.reduce((sum, r) => sum + Math.round((r.booking?.totalPrice || 0) * 100), 0);
  return paise / 100;
}
