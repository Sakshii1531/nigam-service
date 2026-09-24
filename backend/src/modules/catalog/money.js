// Catalogue money is stored and computed in integer paise (docs/master-catalogue
// ARCHITECTURE §3, decision D8) — GST on top of a rupee price produces paise
// (₹1,499 × 18% = ₹269.82), and doing that arithmetic in floating-point rupees
// drifts by a paisa often enough to make two screens disagree. Rupees only
// appear at the API boundary.

export function toPaise(rupees) {
  const value = Number(rupees);
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`Invalid money amount: ${rupees}`);
  }
  return Math.round(value * 100);
}

export function toRupees(paise) {
  return paise / 100;
}

/** `percent`% of an integer paise amount, rounded half-up to the nearest paisa. */
export function percentOf(paise, percent) {
  return Math.round((paise * percent) / 100);
}

export function isPaise(value) {
  return Number.isInteger(value) && value >= 0;
}
