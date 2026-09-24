import { percentOf } from './money.js';
import { catalogError, CATALOG_ERROR_CODES } from './catalogErrors.js';

// The one pricing & payout calculator (docs/master-catalogue ARCHITECTURE §3).
// Pure — no DB, integer paise in and out — so the quote API, the booking
// engine and (later) partner add-ons all compute identical numbers, and every
// rule is unit-testable in isolation.
//
// Per line:
//   base      = unitPrice × qty
//   discount  = allocated coupon amount, capped at base
//   coverage  = base − discount when warranty/AMC/EW covered (customer pays 0)
//   express   = rate.expressFee once per booking, if express (and not covered)
//   taxable   = base − discount − coverage + express
//   gst       = taxable × gstPercent, half-up to the paisa
//   final     = taxable + gst
//   payout    = rate.spPayout × qty (+ rate.expressSpIncentive if express)
//               — independent of price, discount and coverage
//   margin    = taxable − payout   (internal only)

/**
 * @param {object} p
 * @param {object} p.offering  ServiceOffering-like: { minQty, maxQty, express: { enabled }, tax: { gstPercent } }
 * @param {object} p.rate      OfferingRate-like, paise: { customerPrice, spPayout, expressFee, expressSpIncentive }
 * @param {number} p.quantity
 * @param {boolean} [p.isExpress]
 * @param {number} [p.discountPaise]   coupon amount allocated to this line
 * @param {string|null} [p.coverageType]  'Brand Warranty' | 'AMC Visit' | 'NCC Extended Warranty' | null
 * @param {number} p.defaultGstPercent  PlatformSettings.defaultGstPercent
 */
export function priceLine({ offering, rate, quantity, isExpress = false, discountPaise = 0, coverageType = null, defaultGstPercent }) {
  if (!Number.isInteger(quantity) || quantity < offering.minQty || quantity > offering.maxQty) {
    throw catalogError(
      CATALOG_ERROR_CODES.QUANTITY_OUT_OF_RANGE,
      offering.minQty === offering.maxQty
        ? `Quantity must be ${offering.minQty} for this service`
        : `Quantity must be between ${offering.minQty} and ${offering.maxQty}`,
      400,
      { minQty: offering.minQty, maxQty: offering.maxQty },
    );
  }
  if (isExpress && !offering.express?.enabled) {
    throw catalogError(CATALOG_ERROR_CODES.EXPRESS_NOT_AVAILABLE, 'Express service is not available for this service');
  }

  const gstPercent = offering.tax?.gstPercent ?? defaultGstPercent;
  const unitPrice = rate.customerPrice;
  const baseAmount = unitPrice * quantity;
  const discount = Math.min(Math.max(0, discountPaise), baseAmount);
  const covered = Boolean(coverageType);
  const coverageAmount = covered ? baseAmount - discount : 0;
  const expressFee = isExpress && !covered ? rate.expressFee : 0;
  const taxableAmount = baseAmount - discount - coverageAmount + expressFee;
  const gstAmount = percentOf(taxableAmount, gstPercent);
  const finalAmount = taxableAmount + gstAmount;

  const spPayoutUnit = rate.spPayout;
  const expressSpIncentive = isExpress ? rate.expressSpIncentive : 0;
  const spPayoutTotal = spPayoutUnit * quantity + expressSpIncentive;

  return {
    quantity,
    unitPrice,
    baseAmount,
    discount,
    coverage: { type: coverageType, amount: coverageAmount },
    isExpress,
    expressFee,
    taxableAmount,
    gstPercent,
    gstAmount,
    finalAmount,
    spPayoutUnit,
    expressSpIncentive,
    spPayoutTotal,
    nccMargin: taxableAmount - spPayoutTotal,
  };
}

/**
 * Prices several lines as one checkout.
 *
 * A flat coupon (the existing Coupon model's `discount` is ₹, not %) is
 * allocated across lines in order until used up, each line capped at its own
 * base. Coins are a payment method (assumption A2): they reduce what is
 * payable after GST, never the taxable value. The advance is a share of what
 * remains payable after coins, computed per line.
 */
export function priceQuote({
  lines,
  couponPaise = 0,
  coverageType = null,
  defaultGstPercent,
  advancePercent = 0,
  paymentMode = 'after',
  coinsAvailablePaise = 0,
}) {
  let couponLeft = Math.max(0, couponPaise);
  const priced = lines.map((line) => {
    const base = line.rate.customerPrice * line.quantity;
    const allocated = Math.min(couponLeft, base);
    const result = priceLine({ ...line, discountPaise: allocated, coverageType, defaultGstPercent });
    couponLeft -= result.discount;
    return result;
  });

  const sum = (field) => priced.reduce((total, line) => total + line[field], 0);
  const totals = {
    base: sum('baseAmount'),
    discount: sum('discount'),
    coverage: priced.reduce((total, line) => total + line.coverage.amount, 0),
    expressFee: sum('expressFee'),
    taxable: sum('taxableAmount'),
    gst: sum('gstAmount'),
    final: sum('finalAmount'),
    spPayout: sum('spPayoutTotal'),
    nccMargin: sum('nccMargin'),
  };

  // Coins and the advance are settled per line — each line becomes its own
  // booking with its own gateway order — so what a multi-line checkout shows
  // is exactly the sum of what each booking will charge. Coins go to lines in
  // order, like the coupon.
  let coinsLeft = Math.min(Math.max(0, coinsAvailablePaise), totals.final);
  for (const line of priced) {
    line.coinsApplied = Math.min(coinsLeft, line.finalAmount);
    coinsLeft -= line.coinsApplied;
    const payable = line.finalAmount - line.coinsApplied;
    line.advanceAmount = paymentMode === 'advance' ? percentOf(payable, advancePercent) : 0;
    line.payableAfterService = payable - line.advanceAmount;
  }
  const coinsApplied = priced.reduce((total, line) => total + line.coinsApplied, 0);
  const advanceAmount = priced.reduce((total, line) => total + line.advanceAmount, 0);

  return {
    lines: priced,
    totals,
    couponApplied: couponPaise - couponLeft,
    coinsApplied,
    advanceAmount,
    payableNow: advanceAmount,
    payableAfterService: totals.final - coinsApplied - advanceAmount,
  };
}
