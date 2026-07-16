import { describe, it, expect } from '@jest/globals';
import { computeWarrantyStatus, isWithinBrandWarranty } from '../src/modules/shared/warrantyEngine.js';

describe('isWithinBrandWarranty', () => {
  it('is true for a recent purchase within the default 12-month window', () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    expect(isWithinBrandWarranty(oneMonthAgo)).toBe(true);
  });

  it('is false once the warranty period has elapsed', () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    expect(isWithinBrandWarranty(twoYearsAgo)).toBe(false);
  });

  it('is false with no purchase date', () => {
    expect(isWithinBrandWarranty(null)).toBe(false);
  });
});

describe('computeWarrantyStatus', () => {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  it('returns "In Warranty" within the brand period with no overlays', () => {
    expect(computeWarrantyStatus({ purchaseDate: oneMonthAgo })).toBe('In Warranty');
  });

  it('returns "Out of Warranty" past the brand period with no overlays', () => {
    expect(computeWarrantyStatus({ purchaseDate: twoYearsAgo })).toBe('Out of Warranty');
  });

  it('prioritizes an active Extended Warranty over AMC and the base warranty', () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expect(
      computeWarrantyStatus({
        purchaseDate: twoYearsAgo,
        amcActive: true,
        extendedWarrantyActive: true,
        extendedWarrantyValidTill: nextYear,
      }),
    ).toBe('Extended Warranty');
  });

  it('falls back to AMC when the Extended Warranty has expired', () => {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    expect(
      computeWarrantyStatus({
        purchaseDate: twoYearsAgo,
        amcActive: true,
        extendedWarrantyActive: true,
        extendedWarrantyValidTill: lastYear,
      }),
    ).toBe('AMC');
  });

  it('returns "AMC" when only an AMC overlay is active', () => {
    expect(computeWarrantyStatus({ purchaseDate: twoYearsAgo, amcActive: true })).toBe('AMC');
  });
});
