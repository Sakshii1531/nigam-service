import { describe, it, expect } from '@jest/globals';
import { toPaise, toRupees, percentOf, isPaise } from '../src/modules/catalog/money.js';

describe('catalogue money helpers', () => {
  it('converts rupees to whole paise without float drift', () => {
    expect(toPaise(1499)).toBe(149900);
    expect(toPaise(0.29)).toBe(29);
    expect(toPaise(269.82)).toBe(26982);
    expect(toRupees(176882)).toBe(1768.82);
  });

  it('rejects negative and non-numeric amounts', () => {
    expect(() => toPaise(-1)).toThrow(RangeError);
    expect(() => toPaise('abc')).toThrow(RangeError);
  });

  it('rounds percentages half-up to the paisa', () => {
    expect(percentOf(63720, 18)).toBe(11470); // 114.696 → 114.70
    expect(percentOf(149900, 18)).toBe(26982);
    expect(percentOf(59800, 18)).toBe(10764);
  });

  it('recognises valid paise amounts', () => {
    expect(isPaise(100)).toBe(true);
    expect(isPaise(0)).toBe(true);
    expect(isPaise(1.5)).toBe(false);
    expect(isPaise(-5)).toBe(false);
  });
});
