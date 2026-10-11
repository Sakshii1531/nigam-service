import { describe, it, expect } from '@jest/globals';
import { computeCharges } from '../src/modules/shared/pricingEngine.js';

describe('computeCharges', () => {
  it('applies parts markup, sums labor+parts+extras, then GST on the subtotal', () => {
    const result = computeCharges({
      laborRate: 500,
      partsCost: 400,
      partsMarkupPercent: 10, // partsTotal = 440
      additionalCharges: 100,
      gstPercent: 18,
    });
    // subtotal = 500 + 440 + 100 = 1040; gst = 187.2; total = 1227.2
    expect(result.partsTotal).toBe(440);
    expect(result.subtotal).toBe(1040);
    expect(result.gstAmount).toBe(187.2);
    expect(result.total).toBe(1227.2);
  });

  it('defaults every input to 0/GST_PERCENT_DEFAULT when omitted', () => {
    const result = computeCharges();
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
    expect(result.gstPercent).toBe(18);
  });
});
