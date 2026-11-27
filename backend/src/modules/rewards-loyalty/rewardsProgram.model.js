import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { SpinWheelConfig } from './spinWheelConfig.model.js';

// The whole customer rewards programme in one document, edited on the super
// admin's Rewards Program page: how coins and XP are earned, the levels a
// customer climbs (each with its daily free spins), the one-time tasks, and
// the spin wheel's prizes and odds. The customer Play Zone and every coin/XP
// credit read it from here — nothing about rewards is hardcoded in the apps.

export const TASK_KEYS = ['book_service', 'write_review', 'refer_friend'];
export const PRIZE_TYPES = ['coins', 'spin', 'none'];

const levelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Total XP needed to reach this level. The first level is always 0.
    xpRequired: { type: Number, required: true, min: 0 },
    dailySpins: { type: Number, default: 1, min: 0 },
    perks: { type: String, default: '' },
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema(
  {
    key: { type: String, enum: TASK_KEYS, required: true },
    title: { type: String, required: true },
    hint: { type: String, default: '' },
    coins: { type: Number, default: 0, min: 0 },
    xp: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const segmentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    // coins: `value` coins; spin: `value` extra spins today; none: better luck next time.
    prizeType: { type: String, enum: PRIZE_TYPES, default: 'none' },
    value: { type: Number, default: 0, min: 0 },
    // Chance out of 100. All segments together must add up to exactly 100.
    probability: { type: Number, required: true, min: 0, max: 100 },
    color: { type: String, default: '' },
  },
  { _id: false },
);

// Partner (service provider) badges: a partner holds the highest badge whose
// minJobs their completed jobs have reached. The super admin names them and
// sets where each starts, e.g. Bronze from 1, Silver from 100.
const partnerBadgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    minJobs: { type: Number, required: true, min: 0 },
    color: { type: String, default: '' },
  },
  { _id: false },
);

const rewardsProgramSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },
    earning: {
      // Credited when a paid service is completed, per ₹100 of the final bill.
      coinsPer100: { type: Number, default: 5, min: 0 },
      xpPer100: { type: Number, default: 10, min: 0 },
    },
    levels: { type: [levelSchema], default: undefined },
    tasks: { type: [taskSchema], default: undefined },
    partnerBadges: { type: [partnerBadgeSchema], default: undefined },
    spinWheel: {
      isActive: { type: Boolean, default: true },
      xpPerSpin: { type: Number, default: 10, min: 0 },
      segments: { type: [segmentSchema], default: undefined },
    },
  },
  { timestamps: true },
);

applyStandardPlugins(rewardsProgramSchema);

export const RewardsProgram = mongoose.models.RewardsProgram || mongoose.model('RewardsProgram', rewardsProgramSchema);

export const DEFAULT_LEVELS = [
  { name: 'Bronze', xpRequired: 0, dailySpins: 1, perks: 'Welcome to Nigam Care Rewards' },
  { name: 'Silver', xpRequired: 500, dailySpins: 2, perks: '2 free spins every day' },
  { name: 'Gold', xpRequired: 1500, dailySpins: 3, perks: '3 free spins every day' },
  { name: 'Platinum', xpRequired: 4000, dailySpins: 5, perks: '5 free spins every day' },
];

export const DEFAULT_TASKS = [
  { key: 'book_service', title: 'Complete your first service', hint: 'Book any service and get it done', coins: 50, xp: 50, isActive: true },
  { key: 'write_review', title: 'Write a review', hint: 'Rate a completed service', coins: 20, xp: 20, isActive: true },
  { key: 'refer_friend', title: 'Refer a friend', hint: 'A friend joins with your code', coins: 100, xp: 100, isActive: true },
];

export const DEFAULT_PARTNER_BADGES = [
  { name: 'New Partner', minJobs: 0, color: '#64748B' },
  { name: 'Bronze', minJobs: 1, color: '#B45309' },
  { name: 'Silver', minJobs: 100, color: '#64748B' },
  { name: 'Gold', minJobs: 500, color: '#CA8A04' },
  { name: 'Platinum', minJobs: 1000, color: '#0D47A1' },
];

export const DEFAULT_SEGMENTS = [
  { label: '10 Coins', prizeType: 'coins', value: 10, probability: 30 },
  { label: 'Try Again', prizeType: 'none', value: 0, probability: 25 },
  { label: '25 Coins', prizeType: 'coins', value: 25, probability: 20 },
  { label: 'Extra Spin', prizeType: 'spin', value: 1, probability: 10 },
  { label: '50 Coins', prizeType: 'coins', value: 50, probability: 10 },
  { label: '100 Coins', prizeType: 'coins', value: 100, probability: 5 },
];

/**
 * The programme, created on first use. A wheel already set up under the old
 * Spin Wheel Config page carries over (its "rupees" prizes were always paid
 * as coins, so they become coin prizes).
 */
export async function getRewardsProgram() {
  let program = await RewardsProgram.findOne();
  if (program) {
    // Programmes saved before partner badges existed get the defaults.
    if (!program.partnerBadges?.length) {
      program.partnerBadges = DEFAULT_PARTNER_BADGES;
      await program.save();
    }
    return program;
  }
  const legacy = await SpinWheelConfig.findOne().lean();
  const legacySegments = (legacy?.segments || []).map((s) => ({
    label: s.label,
    prizeType: s.winningType === 'spin' ? 'spin' : s.winningType === 'none' ? 'none' : 'coins',
    value: s.value || 0,
    probability: s.probability || 0,
  }));
  const legacyTotal = legacySegments.reduce((sum, s) => sum + s.probability, 0);
  program = await RewardsProgram.create({
    levels: DEFAULT_LEVELS,
    tasks: DEFAULT_TASKS,
    partnerBadges: DEFAULT_PARTNER_BADGES,
    spinWheel: {
      isActive: legacy ? legacy.isActive !== false : true,
      // An old wheel whose odds didn't add up to 100 is replaced by the default.
      segments: legacySegments.length >= 2 && legacyTotal === 100 ? legacySegments : DEFAULT_SEGMENTS,
    },
  });
  return program;
}

/** The level a customer with `xp` has reached, and the next one. */
export function levelFor(xp, levels) {
  const sorted = [...(levels?.length ? levels : DEFAULT_LEVELS)].sort((a, b) => a.xpRequired - b.xpRequired);
  let index = 0;
  sorted.forEach((l, i) => {
    if ((xp || 0) >= l.xpRequired) index = i;
  });
  const current = sorted[index];
  const next = sorted[index + 1] || null;
  return {
    number: index + 1,
    name: current.name,
    xpRequired: current.xpRequired,
    dailySpins: current.dailySpins ?? 1,
    perks: current.perks || '',
    next: next ? { number: index + 2, name: next.name, xpRequired: next.xpRequired } : null,
  };
}

/** The badge a partner with `completedJobs` holds, and how far the next one is. */
export function badgeFor(completedJobs, badges) {
  const sorted = [...(badges?.length ? badges : DEFAULT_PARTNER_BADGES)].sort((a, b) => a.minJobs - b.minJobs);
  const jobs = completedJobs || 0;
  let index = -1;
  sorted.forEach((b, i) => {
    if (jobs >= b.minJobs) index = i;
  });
  const next = sorted[index + 1] || null;
  const current = index >= 0 ? sorted[index] : null;
  return {
    number: index + 1,
    name: current?.name || null,
    color: current?.color || '',
    minJobs: current?.minJobs ?? 0,
    completedJobs: jobs,
    next: next ? { name: next.name, minJobs: next.minJobs, color: next.color || '', jobsToGo: next.minJobs - jobs } : null,
  };
}
