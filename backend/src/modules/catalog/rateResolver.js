import { OfferingRate } from './offeringRate.model.js';

// Which OfferingRate version prices an offering right now, for a location
// (docs/master-catalogue ARCHITECTURE §4). Most specific scope wins —
// PINCODE → CITY → DEFAULT — and within a scope, the version whose
// [effectiveFrom, effectiveUntil) window contains `at`. Only DEFAULT rows are
// written today; the CITY/PINCODE branches are the seam that lets location
// pricing be switched on later without a model or engine change.

const norm = (value) => (value == null ? '' : String(value).trim().toLowerCase());

function pick(rates, { city, pincode }) {
  const byScope = (type, value) =>
    rates
      .filter((rate) => rate.scope.type === type && (type === 'DEFAULT' || norm(rate.scope.value) === norm(value)))
      .sort((a, b) => b.version - a.version)[0];

  return (pincode && byScope('PINCODE', pincode)) || (city && byScope('CITY', city)) || byScope('DEFAULT') || null;
}

/** Active rate per offering id, in one query. Offerings with no active rate are absent from the map. */
export async function resolveRates(offeringIds, { at = new Date(), city = null, pincode = null } = {}) {
  if (!offeringIds.length) return new Map();
  const rates = await OfferingRate.find({
    offering: { $in: offeringIds },
    effectiveFrom: { $lte: at },
    $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: at } }],
  }).lean();

  const grouped = new Map();
  for (const rate of rates) {
    const key = String(rate.offering);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(rate);
  }

  const resolved = new Map();
  for (const [key, list] of grouped) {
    const rate = pick(list, { city, pincode });
    if (rate) resolved.set(key, rate);
  }
  return resolved;
}

/** Active rate for one offering, or null when it has none (→ not bookable). */
export async function resolveRate(offeringId, ctx = {}) {
  return (await resolveRates([offeringId], ctx)).get(String(offeringId)) || null;
}
