import { describe, it, expect } from '@jest/globals';
import { priceLine, priceQuote } from '../src/modules/catalog/offeringPricing.js';

// Every row of the worked-example table in docs/master-catalogue/ARCHITECTURE.md §3.
// Money in paise; GST 18% added on top.

const offering = (overrides = {}) => ({ minQty: 1, maxQty: 10, express: { enabled: true }, tax: { gstPercent: null }, ...overrides });
const rate = (price, payout, overrides = {}) => ({
  customerPrice: price * 100,
  spPayout: payout * 100,
  expressFee: 9900,
  expressSpIncentive: 5000,
  ...overrides,
});
const line = (overrides) => priceLine({ defaultGstPercent: 18, isExpress: false, ...overrides });

describe('priceLine — ARCHITECTURE §3 worked examples', () => {
  it.each([
    ['Split AC 1.5T Install ×1', 1499, 900, 1, { base: 149900, gst: 26982, final: 176882, payout: 90000, margin: 59900 }],
    ['Window AC Install ×1', 599, 350, 1, { base: 59900, gst: 10782, final: 70682, payout: 35000, margin: 24900 }],
    ['LED TV 32" Install', 349, 200, 1, { base: 34900, gst: 6282, final: 41182, payout: 20000, margin: 14900 }],
    ['LED TV 55–65" Install', 799, 450, 1, { base: 79900, gst: 14382, final: 94282, payout: 45000, margin: 34900 }],
    ['Fan Install ×2', 299, 180, 2, { base: 59800, gst: 10764, final: 70564, payout: 36000, margin: 23800 }],
  ])('%s', (_label, price, payout, quantity, expected) => {
    const result = line({ offering: offering(), rate: rate(price, payout), quantity });
    expect({
      base: result.baseAmount,
      gst: result.gstAmount,
      final: result.finalAmount,
      payout: result.spPayoutTotal,
      margin: result.nccMargin,
    }).toEqual(expected);
  });

  it('Fan ×2 express — fee once per booking, incentive added to payout', () => {
    const result = line({ offering: offering(), rate: rate(299, 180), quantity: 2, isExpress: true });
    expect(result.expressFee).toBe(9900);
    expect(result.taxableAmount).toBe(69700);
    expect(result.gstAmount).toBe(12546);
    expect(result.finalAmount).toBe(82246);
    expect(result.spPayoutTotal).toBe(41000);
    expect(result.nccMargin).toBe(28700);
  });

  it('Fan ×2 express with a flat ₹60 coupon — discount before GST, payout untouched', () => {
    const result = line({ offering: offering(), rate: rate(299, 180), quantity: 2, isExpress: true, discountPaise: 6000 });
    expect(result.discount).toBe(6000);
    expect(result.taxableAmount).toBe(63700);
    expect(result.gstAmount).toBe(11466);
    expect(result.finalAmount).toBe(75166);
    expect(result.spPayoutTotal).toBe(41000);
    expect(result.nccMargin).toBe(22700);
  });

  it('warranty-covered — customer pays 0, partner still earns the fixed payout', () => {
    const result = line({ offering: offering(), rate: rate(1499, 900), quantity: 1, coverageType: 'Brand Warranty' });
    expect(result.coverage).toEqual({ type: 'Brand Warranty', amount: 149900 });
    expect(result.finalAmount).toBe(0);
    expect(result.spPayoutTotal).toBe(90000);
    expect(result.nccMargin).toBe(-90000);
  });
});

describe('priceLine — rules', () => {
  it('rejects quantity outside min/max and non-integers', () => {
    const o = offering({ minQty: 1, maxQty: 3 });
    for (const quantity of [0, 4, 1.5]) {
      expect(() => line({ offering: o, rate: rate(349, 200), quantity })).toThrow(expect.objectContaining({ code: 'QUANTITY_OUT_OF_RANGE' }));
    }
  });

  it('explains a fixed quantity for per-visit services', () => {
    expect(() => line({ offering: offering({ minQty: 1, maxQty: 1 }), rate: rate(199, 120), quantity: 2 })).toThrow(
      'Quantity must be 1 for this service',
    );
  });

  it('rejects express when the offering has it disabled', () => {
    expect(() => line({ offering: offering({ express: { enabled: false } }), rate: rate(199, 120), quantity: 1, isExpress: true })).toThrow(
      expect.objectContaining({ code: 'EXPRESS_NOT_AVAILABLE' }),
    );
  });

  it('uses an offering-level GST override over the platform default', () => {
    const result = line({ offering: offering({ tax: { gstPercent: 5 } }), rate: rate(1000, 600), quantity: 1 });
    expect([result.gstPercent, result.gstAmount, result.finalAmount]).toEqual([5, 5000, 105000]);
  });

  it('caps a discount larger than the base', () => {
    const result = line({ offering: offering(), rate: rate(99, 60), quantity: 1, discountPaise: 50000 });
    expect([result.discount, result.taxableAmount, result.finalAmount]).toEqual([9900, 0, 0]);
  });

  it('payout never depends on the customer price (client Test 8)', () => {
    const at799 = line({ offering: offering(), rate: rate(799, 450), quantity: 1 });
    const at899 = line({ offering: offering(), rate: rate(899, 450), quantity: 1 });
    expect(at799.spPayoutTotal).toBe(at899.spPayoutTotal);
  });
});

describe('priceQuote', () => {
  const lines = [
    { offering: offering(), rate: rate(299, 180), quantity: 2 },
    { offering: offering(), rate: rate(99, 60), quantity: 1 },
  ];

  it('sums lines into totals', () => {
    const quote = priceQuote({ lines, defaultGstPercent: 18 });
    expect(quote.totals.base).toBe(69700);
    expect(quote.totals.final).toBe(70564 + 11682);
    expect(quote.totals.spPayout).toBe(36000 + 6000);
    expect(quote.payableAfterService).toBe(quote.totals.final);
    expect(quote.payableNow).toBe(0);
  });

  it('allocates a flat coupon across lines in order', () => {
    const quote = priceQuote({ lines, couponPaise: 65000, defaultGstPercent: 18 });
    expect(quote.lines.map((l) => l.discount)).toEqual([59800, 5200]);
    expect(quote.couponApplied).toBe(65000);
  });

  it('does not use more coupon than the lines are worth', () => {
    const quote = priceQuote({ lines, couponPaise: 100000, defaultGstPercent: 18 });
    expect(quote.couponApplied).toBe(69700);
    expect(quote.totals.final).toBe(0);
  });

  it('applies coins after GST, capped at the total', () => {
    const quote = priceQuote({ lines: [lines[0]], defaultGstPercent: 18, coinsAvailablePaise: 10000 });
    expect(quote.totals.gst).toBe(10764); // GST on the pre-coin amount
    expect(quote.coinsApplied).toBe(10000);
    expect(quote.payableAfterService).toBe(70564 - 10000);

    const capped = priceQuote({ lines: [lines[0]], defaultGstPercent: 18, coinsAvailablePaise: 999999 });
    expect(capped.coinsApplied).toBe(70564);
    expect(capped.payableAfterService).toBe(0);
  });

  it('takes the advance as a share of what is payable after coins', () => {
    const quote = priceQuote({ lines: [lines[0]], defaultGstPercent: 18, paymentMode: 'advance', advancePercent: 20 });
    expect(quote.advanceAmount).toBe(14113); // 20% of 705.64 = 141.128 → 141.13
    expect(quote.payableNow).toBe(14113);
    expect(quote.payableAfterService).toBe(70564 - 14113);
  });
});
