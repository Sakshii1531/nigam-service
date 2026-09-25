import { computeCharges } from './pricingEngine.js';
import { coveredVisitEarnings } from './serviceProviderEarnings.js';
import { toPaise } from '../catalog/money.js';

// What a service partner earns for a job, and what the customer is billed at
// the end of it (docs/master-catalogue Phase 5).
//
// Payout is the FIXED amount frozen on the booking when it was made —
// offering spPayout × quantity (+ express incentive) — never a share of the
// customer price (client Req 7–9, Test 8). A warranty/AMC/EW-covered booking
// still earns its offering payout (assumption A5). Catalogue add-ons done on
// site add their own configured payout. Spare parts earn the partner nothing.

const paise = (rupees) => toPaise(Number(rupees) || 0);
const rupees = (p) => p / 100;

/**
 * The payout a job starts with. Booking-backed jobs use the booking's
 * commercial snapshot (every booking has one since the catalogue cut-over);
 * a brand-raised complaint with no booking uses the brand's RateCard. There
 * is no percentage-of-price rule any more (client Req 7–9).
 */
export async function initialJobPayout(serviceRequest, booking) {
  const commercial = booking?.commercial;
  if (commercial && commercial.spPayoutTotal != null) {
    const expressIncentive = commercial.expressSpIncentive || 0;
    const base = rupees(paise(commercial.spPayoutTotal) - paise(expressIncentive));
    return { base, expressIncentive, addOns: 0, total: commercial.spPayoutTotal };
  }
  const covered = await coveredVisitEarnings(serviceRequest);
  return { base: covered, expressIncentive: 0, addOns: 0, total: covered };
}

/** Recomputes payout.addOns / payout.total from the job's catalogue add-ons. */
export function withAddOnPayout(payout, addOns = []) {
  const addOnsPaise = addOns.filter((a) => a.checked !== false).reduce((sum, a) => sum + paise(a.spPayout), 0);
  const basePaise = paise(payout?.base) + paise(payout?.expressIncentive);
  return {
    base: payout?.base || 0,
    expressIncentive: payout?.expressIncentive || 0,
    addOns: rupees(addOnsPaise),
    total: rupees(basePaise + addOnsPaise),
  };
}

/**
 * The end-of-job bill. The booked service is charged exactly as booked
 * (its snapshot final already includes GST — it is NOT taxed again);
 * catalogue add-ons are charged at their engine-priced finals (GST
 * included); spare parts (paid jobs only) get GST added here. Whatever the
 * customer already paid (verified advance, coins) is subtracted from what
 * the partner collects.
 */
export function computeJobBilling(job, booking) {
  const bookedPaise = job.isD2C ? paise(booking?.commercial?.finalAmount ?? booking?.totalPrice ?? job.price) : 0;
  const addOns = (job.additionalServices || []).filter((a) => a.checked !== false);
  const addOnsPaise = addOns.reduce((sum, a) => sum + paise(a.finalAmount ?? a.price), 0);

  const partsCost = job.isD2C ? (job.spareParts || []).filter((p) => p.checked).reduce((sum, p) => sum + (p.price || 0), 0) : 0;
  const parts = computeCharges({ partsCost });
  const partsPaise = paise(parts.total);

  const totalPaise = bookedPaise + addOnsPaise + partsPaise;
  const advancePaise = booking?.advancePaid ? paise(booking.advanceAmount) : 0;
  const coinsPaise = paise(booking?.commercial?.coinsApplied);
  const alreadyPaidPaise = Math.min(totalPaise, advancePaise + coinsPaise);

  const payout = withAddOnPayout(job.payout, addOns);

  return {
    serviceCharge: rupees(bookedPaise),
    additionalServicesTotal: rupees(addOnsPaise),
    sparePartsTotal: rupees(partsPaise),
    gstPercent: parts.gstPercent,
    total: rupees(totalPaise),
    alreadyPaid: rupees(alreadyPaidPaise),
    amountToCollect: rupees(totalPaise - alreadyPaidPaise),
    serviceProviderEarnings: payout.total,
  };
}
