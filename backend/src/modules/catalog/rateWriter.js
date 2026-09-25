import { OfferingRate, RATE_MONEY_FIELDS } from './offeringRate.model.js';
import { ServiceOffering } from './serviceOffering.model.js';
import { isPaise } from './money.js';
import { runInTransaction } from '../../utils/transaction.js';
import { ApiError } from '../../middleware/errorHandler.js';

const DEFAULT_SCOPE = Object.freeze({ type: 'DEFAULT', value: null });

function scopeFilter(offeringId, scope) {
  return { offering: offeringId, 'scope.type': scope.type, 'scope.value': scope.value ?? null };
}

/** Latest version for an offering+scope (the one a new version builds on), or null. */
export async function findLatestRate(offeringId, scope = DEFAULT_SCOPE, { session = null } = {}) {
  return OfferingRate.findOne(scopeFilter(offeringId, scope)).sort({ version: -1 }).session(session);
}

/**
 * The single place an offering's commercial numbers change.
 *
 * `patch` holds only the money fields being changed (integer paise); every
 * field not in it is carried forward from the latest version unchanged. There
 * is deliberately no code path that derives spPayout from customerPrice — so a
 * customer price change can never move a partner's payout (client Test 8).
 */
export async function createRateVersion(
  offeringId,
  patch,
  { reason = '', changedBy = null, effectiveFrom = new Date(), scope = DEFAULT_SCOPE, needsRateReview = false } = {},
) {
  const unknown = Object.keys(patch).filter((key) => !RATE_MONEY_FIELDS.includes(key));
  if (unknown.length) throw new ApiError(400, `Not a rate field: ${unknown.join(', ')}`);
  for (const [field, value] of Object.entries(patch)) {
    if (!isPaise(value)) throw new ApiError(400, `${field} must be a non-negative whole number of paise`);
  }

  return runInTransaction(async (session) => {
    const offering = await ServiceOffering.findById(offeringId).session(session);
    if (!offering) throw new ApiError(404, 'Offering not found');

    const current = await findLatestRate(offeringId, scope, { session });
    const from = new Date(effectiveFrom);

    let next;
    let changes;
    if (!current) {
      const missing = RATE_MONEY_FIELDS.filter((field) => patch[field] === undefined);
      if (missing.length) throw new ApiError(400, `The first rate needs every amount — missing ${missing.join(', ')}`);
      next = { ...patch };
      changes = [];
    } else {
      if (!reason.trim()) throw new ApiError(400, 'A reason is required when changing a rate');
      if (from < current.effectiveFrom) {
        throw new ApiError(400, 'A new rate cannot take effect before the current version does');
      }
      next = Object.fromEntries(RATE_MONEY_FIELDS.map((field) => [field, patch[field] ?? current[field]]));
      changes = RATE_MONEY_FIELDS
        .filter((field) => next[field] !== current[field])
        .map((field) => ({ field, from: current[field], to: next[field] }));
      // A location override that was ended earlier starts again as a fresh
      // version — even at the same amounts — and its closed window stays closed.
      const ended = current.effectiveUntil && current.effectiveUntil <= from;
      if (!changes.length && !ended) throw new ApiError(400, 'Nothing changed — the new rate matches the current one');

      if (!ended) {
        current.effectiveUntil = from;
        await current.save({ session });
      }
    }

    const [rate] = await OfferingRate.create(
      [{
        offering: offeringId,
        scope: { type: scope.type, value: scope.value ?? null },
        version: current ? current.version + 1 : 1,
        ...next,
        effectiveFrom: from,
        changes,
        reason: reason.trim(),
        changedBy,
      }],
      session ? { session } : {},
    );

    // The DEMO flag is about the default price list; a city or pincode
    // override doesn't make a placeholder default rate real.
    if (scope.type === 'DEFAULT' && offering.needsRateReview !== needsRateReview) {
      offering.needsRateReview = needsRateReview;
      await offering.save({ session });
    }

    return rate;
  });
}

/**
 * Ends a CITY / PINCODE override now: its current version gets
 * `effectiveUntil = at`, and quotes fall back to the next scope (CITY, then
 * DEFAULT). The version itself is kept — it stays in the history. The
 * default price list can't be ended, only changed.
 */
export async function endRateScope(offeringId, scope, { at = new Date() } = {}) {
  if (!scope || scope.type === 'DEFAULT') throw new ApiError(400, 'The default rate cannot be ended — change it instead');
  const current = await findLatestRate(offeringId, scope);
  if (!current || (current.effectiveUntil && current.effectiveUntil <= at)) {
    throw new ApiError(404, 'No active price for this location');
  }
  current.effectiveUntil = at;
  await current.save();
  return current;
}
