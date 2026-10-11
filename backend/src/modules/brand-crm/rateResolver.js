import { BrandRate } from './brandRate.model.js';
/** Effective intervals are [from, to). Closed historical rows remain resolvable. */
export async function resolveRate({
  brand,
  categoryId,
  serviceType,
  state,
  city,
  at = new Date(),
  session = null
}) {
  const rows = await BrandRate.find({
    brand,
    category: categoryId,
    serviceType,
    effectiveFrom: {
      $lte: at
    },
    $and: [{
      $or: [{
        effectiveTo: null
      }, {
        effectiveTo: {
          $gt: at
        }
      }]
    }, {
      $or: [{
        isActive: true
      }, {
        effectiveTo: {
          $ne: null
        }
      }]
    }]
  }).select('+partnerPayout').session(session).lean();
  const eq = (a, b) => a && b && a.toLowerCase() === b.toLowerCase();
  const candidates = rows.filter(r => (!r.state || eq(r.state, state)) && (!r.city || eq(r.city, city)));
  candidates.sort((a, b) => (b.city ? 2 : b.state ? 1 : 0) - (a.city ? 2 : a.state ? 1 : 0) || +b.effectiveFrom - +a.effectiveFrom);
  const row = candidates[0] || null;
  return row ? {
    rate: row.brandRate,
    amount: row.brandRate,
    matchedOn: row.city ? 'city' : row.state ? 'state' : 'national',
    row
  } : {
    rate: 0,
    amount: 0,
    matchedOn: 'missing',
    row: null
  };
}
