import { LoyaltyMilestone } from '../rewards-loyalty/loyaltyMilestone.model.js';
import { SpinWheelConfig } from '../rewards-loyalty/spinWheelConfig.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ReferralCampaign } from '../rewards-loyalty/referralCampaign.model.js';
import { Referral } from '../rewards-loyalty/referral.model.js';

// Super-admin authoring layer for loyalty config (BACKEND_CONTEXT.md §6.3) —
// milestone thresholds, membership tier definitions, spin-wheel segment odds.
// Distinct from (and much smaller than) the full customer-facing earn/redeem/
// spin flows, which stay deferred per the Phase 5 scope decision — this is
// admin CRUD over the config rows those flows would eventually read. The
// referral flow itself (auth.service.js's signupVerify) is wired, and
// getReferralStats below reads its real output.

export async function listMilestones() {
  return LoyaltyMilestone.find().sort({ threshold: 1 });
}
export async function createMilestone(data) {
  return LoyaltyMilestone.create(data);
}
export async function updateMilestone(id, updates) {
  const milestone = await LoyaltyMilestone.findByIdAndUpdate(id, updates, { new: true });
  if (!milestone) throw new ApiError(404, 'Loyalty milestone not found');
  return milestone;
}
export async function deleteMilestone(id) {
  const milestone = await LoyaltyMilestone.findByIdAndDelete(id);
  if (!milestone) throw new ApiError(404, 'Loyalty milestone not found');
}

export async function getSpinWheelConfig() {
  let config = await SpinWheelConfig.findOne();
  if (!config) config = await SpinWheelConfig.create({ segments: [] });
  return config;
}

/** Segment probabilities must sum to <= 100 (the remainder is an implicit
 * "no win" chance) — validated here since the model doc explicitly defers this
 * check to "the super-admin service layer in Phase 8". */
export async function updateSpinWheelConfig({ segments, isActive }) {
  const sum = (segments || []).reduce((total, s) => total + s.probability, 0);
  if (sum > 100) throw new ApiError(400, `Segment probabilities must sum to 100 or less (got ${sum})`);

  const config = await getSpinWheelConfig();
  if (segments !== undefined) config.segments = segments;
  if (isActive !== undefined) config.isActive = isActive;
  await config.save();
  return config;
}

// Referral offers — the customer app's refer-and-earn screen reads the Active
// one; individual redemptions are recorded separately as Referral rows.

export async function listReferralCampaigns() {
  return ReferralCampaign.find().sort({ createdAt: -1 });
}
export async function createReferralCampaign(data) {
  return ReferralCampaign.create(data);
}
export async function updateReferralCampaign(id, updates) {
  const doc = await ReferralCampaign.findByIdAndUpdate(id, updates, { new: true });
  if (!doc) throw new ApiError(404, 'Referral campaign not found');
  return doc;
}
export async function deleteReferralCampaign(id) {
  const doc = await ReferralCampaign.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Referral campaign not found');
}

/**
 * Real numbers for LoyaltyProgram.jsx's referrals tab stat cards — previously
 * a hardcoded { totalShared: 1450, successfulConversions: 840, totalCoinsPaid:
 * 84000 }. "Links shared" has no backing event (nothing on the customer app
 * currently logs a share-button tap, only successful signups), so rather than
 * inventing another fake number, this reports something real instead: how
 * many distinct customers have successfully referred at least one person.
 */
export async function getReferralStats() {
  const [totalReferrers, successfulConversions, coinsAgg] = await Promise.all([
    Referral.distinct('referrer').then((ids) => ids.length),
    Referral.countDocuments({ status: 'Credited' }),
    Referral.aggregate([
      { $match: { status: 'Credited' } },
      { $group: { _id: null, total: { $sum: '$bonusAmount' } } },
    ]),
  ]);
  return {
    totalReferrers,
    successfulConversions,
    totalCoinsPaid: coinsAgg[0]?.total || 0,
  };
}
