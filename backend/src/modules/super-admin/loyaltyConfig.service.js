import { LoyaltyMilestone } from '../rewards-loyalty/loyaltyMilestone.model.js';
import { Membership } from '../rewards-loyalty/membership.model.js';
import { SpinWheelConfig } from '../rewards-loyalty/spinWheelConfig.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Super-admin authoring layer for loyalty config (BACKEND_CONTEXT.md §6.3) —
// milestone thresholds, membership tier definitions, spin-wheel segment odds.
// Distinct from (and much smaller than) the full customer-facing earn/redeem/
// spin/referral *flows*, which stay deferred per the Phase 5 scope decision —
// this is admin CRUD over the config rows those flows would eventually read.

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

export async function listMemberships() {
  return Membership.find().sort({ tierRank: 1 });
}
export async function createMembership(data) {
  const existing = await Membership.findOne({ tierRank: data.tierRank });
  if (existing) throw new ApiError(409, `A membership tier with rank ${data.tierRank} already exists`);
  return Membership.create(data);
}
export async function updateMembership(id, updates) {
  const membership = await Membership.findByIdAndUpdate(id, updates, { new: true });
  if (!membership) throw new ApiError(404, 'Membership tier not found');
  return membership;
}
export async function deleteMembership(id) {
  const membership = await Membership.findByIdAndDelete(id);
  if (!membership) throw new ApiError(404, 'Membership tier not found');
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
