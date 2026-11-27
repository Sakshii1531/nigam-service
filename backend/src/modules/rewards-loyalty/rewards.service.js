import { randomInt } from 'node:crypto';
import { User } from '../auth/user.model.js';
import { Booking } from '../booking/booking.model.js';
import { Review } from '../reviews/review.model.js';
import { Referral } from './referral.model.js';
import { WalletLedger } from '../payments-wallet/walletLedger.model.js';
import { creditCoins, syncLevel } from '../payments-wallet/wallet.service.js';
import { getRewardsProgram, levelFor, badgeFor, RewardsProgram, TASK_KEYS } from './rewardsProgram.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Customer side of the Rewards Program (rewardsProgram.model.js): what the
// Play Zone shows, spinning the wheel, claiming one-time tasks, and the coins
// a completed paid service earns. Every amount comes from the programme the
// super admin configures; the customer app never says how much to credit.

const todayIst = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function spinsLeftFor(user, level, day = todayIst()) {
  if (user.spinDay !== day) return level.dailySpins;
  return Math.max(0, level.dailySpins + (user.bonusSpins || 0) - (user.spinsUsedToday || 0));
}

/** The wheel as customers see it (no odds). Empty when the wheel or the programme is off. */
export function publicWheel(program) {
  const on = program.isActive && program.spinWheel?.isActive;
  return {
    isActive: Boolean(on),
    segments: on ? (program.spinWheel.segments || []).map(({ label, prizeType, value, color }) => ({ label, prizeType, value, color })) : [],
  };
}

async function taskStatus(userId, key) {
  if (key === 'book_service') return Boolean(await Booking.exists({ user: userId, status: 'Completed' }));
  if (key === 'write_review') return Boolean(await Review.exists({ user: userId }));
  if (key === 'refer_friend') return Boolean(await Referral.exists({ referrer: userId, status: 'Credited' }));
  return false;
}

/** Everything the Play Zone shows for this customer. */
export async function getCustomerRewards(userId) {
  const [program, user] = await Promise.all([getRewardsProgram(), User.findById(userId)]);
  if (!user) throw new ApiError(404, 'User not found');
  const level = levelFor(user.xp || 0, program.levels);
  const claimed = new Set((await WalletLedger.find({ user: userId, claimKey: { $in: TASK_KEYS.map((k) => `task:${k}`) } }).select('claimKey')).map((e) => e.claimKey));
  const tasks = program.isActive
    ? await Promise.all(
        (program.tasks || [])
          .filter((t) => t.isActive)
          .map(async (t) => ({
            key: t.key,
            title: t.title,
            hint: t.hint,
            coins: t.coins,
            xp: t.xp,
            done: await taskStatus(userId, t.key),
            claimed: claimed.has(`task:${t.key}`) || claimed.has(t.key),
          })),
      )
    : [];
  return {
    isActive: program.isActive,
    coins: user.walletCoins || 0,
    xp: user.xp || 0,
    level,
    levels: [...(program.levels || [])].sort((a, b) => a.xpRequired - b.xpRequired).map(({ name, xpRequired, dailySpins, perks }) => ({ name, xpRequired, dailySpins, perks })),
    spinsLeft: program.isActive ? spinsLeftFor(user, level) : 0,
    earning: program.earning,
    wheel: publicWheel(program),
    tasks,
  };
}

/**
 * One spin. The allowance is the customer's level's daily spins plus any
 * extra spins won today; using one is a single conditional update, so two
 * taps at once can't spend the same spin twice.
 */
export async function spin(userId) {
  const program = await getRewardsProgram();
  const wheel = program.spinWheel || {};
  const segments = wheel.segments || [];
  if (!program.isActive || !wheel.isActive || segments.length < 2) throw new ApiError(400, 'The spin wheel is not available right now.');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  const level = levelFor(user.xp || 0, program.levels);
  const day = todayIst();
  await User.updateOne({ _id: userId, spinDay: { $ne: day } }, { spinDay: day, spinsUsedToday: 0, bonusSpins: 0 });
  const used = await User.findOneAndUpdate(
    { _id: userId, spinDay: day, $expr: { $lt: [{ $ifNull: ['$spinsUsedToday', 0] }, { $add: [level.dailySpins, { $ifNull: ['$bonusSpins', 0] }] }] } },
    { $inc: { spinsUsedToday: 1 } },
    { new: true },
  );
  if (!used) throw new ApiError(400, 'No spins left today. Come back tomorrow!');

  // Odds out of 100 (they always add up to 100 — checked when saved).
  const roll = randomInt(0, 10000) / 100;
  let winIndex = segments.length - 1;
  let cumulative = 0;
  for (let i = 0; i < segments.length; i += 1) {
    cumulative += segments[i].probability || 0;
    if (roll < cumulative) {
      winIndex = i;
      break;
    }
  }
  const prize = segments[winIndex];

  if (prize.prizeType === 'spin' && prize.value > 0) await User.updateOne({ _id: userId }, { $inc: { bonusSpins: prize.value } });
  const coins = prize.prizeType === 'coins' ? prize.value || 0 : 0;
  const xp = wheel.xpPerSpin || 0;
  if (coins > 0 || xp > 0) await creditCoins(userId, coins, { reason: 'spin_wheel', xpToAdd: xp });

  const after = await User.findById(userId);
  const newLevel = levelFor(after.xp || 0, program.levels);
  return {
    winIndex,
    prize: { label: prize.label, prizeType: prize.prizeType, value: prize.value },
    coinsWon: coins,
    xpEarned: xp,
    coins: after.walletCoins || 0,
    xp: after.xp || 0,
    level: newLevel,
    leveledUp: newLevel.number > level.number,
    spinsLeft: spinsLeftFor(after, newLevel, day),
  };
}

/** Pays a one-time task, after checking the customer really did it. Once per customer. */
export async function claimTask(userId, key) {
  const program = await getRewardsProgram();
  const task = (program.tasks || []).find((t) => t.key === key && t.isActive);
  if (!program.isActive || !task) throw new ApiError(404, 'This reward is not available.');
  if (await WalletLedger.exists({ user: userId, claimKey: { $in: [`task:${key}`, key] } })) throw new ApiError(409, 'You have already claimed this reward.');
  if (!(await taskStatus(userId, key))) throw new ApiError(400, 'Finish this task first, then claim the reward.');
  if (task.coins <= 0 && task.xp <= 0) throw new ApiError(400, 'This reward has nothing to give yet.');
  await creditCoins(userId, task.coins, { reason: key === 'refer_friend' ? 'referral' : 'earned', xpToAdd: task.xp, claimKey: `task:${key}` });
  return getCustomerRewards(userId);
}

/**
 * Coins and XP for a completed paid service, per ₹100 of the bill. Called
 * when a job is paid; keyed on the booking so it is credited once.
 */
export async function awardForSpend(userId, amountRupees, { key }) {
  if (!userId || !(amountRupees > 0)) return null;
  const program = await getRewardsProgram();
  if (!program.isActive) return null;
  const hundreds = amountRupees / 100;
  const coins = Math.floor(hundreds * (program.earning?.coinsPer100 || 0));
  const xp = Math.floor(hundreds * (program.earning?.xpPer100 || 0));
  if (coins <= 0 && xp <= 0) return null;
  if (await WalletLedger.exists({ user: userId, claimKey: key })) return null;
  try {
    return await creditCoins(userId, coins, { reason: 'earned', xpToAdd: xp, claimKey: key });
  } catch (err) {
    if (err.statusCode === 409 || err.code === 11000) return null;
    throw err;
  }
}

// ─── Super admin ──────────────────────────────────────────────────────────

export function validateProgram(body) {
  const levels = [...(body.levels || [])].sort((a, b) => a.xpRequired - b.xpRequired);
  if (!levels.length) throw new ApiError(400, 'Add at least one level.');
  if (levels[0].xpRequired !== 0) throw new ApiError(400, 'The first level must start at 0 XP.');
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i].xpRequired === levels[i - 1].xpRequired) throw new ApiError(400, `Two levels need the same XP (${levels[i].xpRequired}). Each level needs more XP than the one before.`);
  }
  const names = levels.map((l) => l.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) throw new ApiError(400, 'Each level needs a different name.');

  const segments = body.spinWheel?.segments || [];
  if (body.spinWheel?.isActive) {
    if (segments.length < 2) throw new ApiError(400, 'The spin wheel needs at least 2 segments.');
    if (segments.length > 12) throw new ApiError(400, 'The spin wheel can have at most 12 segments.');
  }
  if (segments.length) {
    const total = Math.round(segments.reduce((sum, s) => sum + s.probability, 0) * 100) / 100;
    if (total !== 100) throw new ApiError(400, `The chances of all segments must add up to exactly 100% (now ${total}%).`);
    const bad = segments.find((s) => s.prizeType !== 'none' && !(s.value > 0));
    if (bad) throw new ApiError(400, `"${bad.label}" needs a value (how many coins or spins it gives).`);
  }
  const badges = [...(body.partnerBadges || [])].sort((a, b) => a.minJobs - b.minJobs);
  if (!badges.length) throw new ApiError(400, 'Add at least one partner badge.');
  if (badges[0].minJobs !== 0) throw new ApiError(400, 'The first partner badge must start at 0 completed jobs, so every partner has one.');
  for (let i = 1; i < badges.length; i += 1) {
    if (badges[i].minJobs === badges[i - 1].minJobs) throw new ApiError(400, `Two partner badges start at ${badges[i].minJobs} jobs. Each badge must start higher than the one before.`);
  }
  const badgeNames = badges.map((b) => b.name.trim().toLowerCase());
  if (new Set(badgeNames).size !== badgeNames.length) throw new ApiError(400, 'Each partner badge needs a different name.');

  const keys = (body.tasks || []).map((t) => t.key);
  if (new Set(keys).size !== keys.length) throw new ApiError(400, 'Each task can appear only once.');
  return { ...body, levels, partnerBadges: badges };
}

export async function getProgramForAdmin() {
  const program = await getRewardsProgram();
  return { program, stats: await programStats(program) };
}

export async function updateProgram(body) {
  const clean = validateProgram(body);
  const program = await getRewardsProgram();
  program.isActive = clean.isActive;
  program.earning = clean.earning;
  program.levels = clean.levels;
  program.tasks = clean.tasks;
  program.partnerBadges = clean.partnerBadges;
  program.spinWheel = clean.spinWheel;
  await program.save();
  // Levels may have moved: put every customer on the level their XP now reaches.
  await resyncLevels();
  return getProgramForAdmin();
}

async function programStats(program) {
  const [given, spins, customers, partners] = await Promise.all([
    WalletLedger.aggregate([{ $match: { delta: { $gt: 0 }, reason: { $ne: 'refund' } } }, { $group: { _id: '$reason', coins: { $sum: '$delta' } } }]),
    WalletLedger.countDocuments({ reason: 'spin_wheel' }),
    User.find({ role: 'customer' }).select('xp').lean(),
    ServiceProvider.find({}).select('completedJobsCount').lean(),
  ]);
  const byReason = Object.fromEntries(given.map((g) => [g._id, g.coins]));
  const levels = [...(program.levels || [])].sort((a, b) => a.xpRequired - b.xpRequired);
  const perLevel = levels.map((l) => ({ name: l.name, customers: 0 }));
  for (const c of customers) perLevel[levelFor(c.xp || 0, levels).number - 1].customers += 1;
  const badges = [...(program.partnerBadges || [])].sort((a, b) => a.minJobs - b.minJobs);
  const perBadge = badges.map((b) => ({ name: b.name, partners: 0 }));
  for (const p of partners) {
    const { number } = badgeFor(p.completedJobsCount || 0, badges);
    if (number > 0) perBadge[number - 1].partners += 1;
  }
  return {
    partnersPerBadge: perBadge,
    coinsGiven: Object.values(byReason).reduce((a, b) => a + b, 0),
    coinsBySource: { spending: byReason.earned || 0, spinWheel: byReason.spin_wheel || 0, referrals: byReason.referral || 0 },
    spinPrizesWon: spins,
    customersPerLevel: perLevel,
  };
}

/** Re-applies the level settings to every customer (after levels change). */
export async function resyncLevels() {
  const customers = await User.find({ role: 'customer' }).select('xp level');
  for (const c of customers) await syncLevel(c);
}

export { RewardsProgram };
