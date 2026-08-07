import mongoose from 'mongoose';
import { EarningsTally } from './earningsTally.model.js';
import { Payout } from './payout.model.js';
import { Job } from './job.model.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';
import { Technician } from './technician.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

const PLATFORM_FEE_PERCENT = 2; // flat fee on instant 'Quick' payouts; 'Invoice' payouts settle fee-free on the next billing cycle

export async function getEarningsSummary(technicianId) {
  return EarningsTally.findOneAndUpdate(
    { technician: technicianId },
    { $setOnInsert: { technician: technicianId } },
    { upsert: true, new: true },
  );
}

/**
 * Debits EarningsTally.total then creates the Payout record — same
 * riskiest-first-plus-best-effort-compensation pattern as order.service.js,
 * since there's no multi-document transaction available locally (Phase 5's
 * documented, user-approved tradeoff).
 */
export async function requestPayout(technicianId, { amount, payoutType = 'Quick' }) {
  const technician = await Technician.findById(technicianId);
  if (!technician) throw new ApiError(404, 'Technician not found');

  const primaryMethod = technician.payoutMethods.find((m) => m.isPrimary) || technician.payoutMethods[0];
  if (!primaryMethod) throw new ApiError(400, 'No payout method on file — add one before requesting a payout');

  const platformFee = payoutType === 'Quick' ? Math.round((amount * PLATFORM_FEE_PERCENT) / 100) : 0;
  const netAmount = amount - platformFee;

  const updatedTally = await EarningsTally.findOneAndUpdate(
    { technician: technicianId, total: { $gte: amount } },
    { $inc: { total: -amount } },
    { new: true },
  );
  if (!updatedTally) throw new ApiError(400, 'Insufficient earnings balance for this payout amount');

  try {
    return await Payout.create({
      technician: technicianId,
      baseAmount: amount,
      platformFee,
      netAmount,
      payoutType,
      status: payoutType === 'Quick' ? 'Settled' : 'Pending',
      creditedTo: primaryMethod.detail,
      transactionId: `PAYOUT-${Date.now()}`,
    });
  } catch (err) {
    await EarningsTally.findOneAndUpdate({ technician: technicianId }, { $inc: { total: amount } });
    throw err;
  }
}

export async function listPayouts(technicianId, { status, page, limit, sort } = {}) {
  const query = { technician: technicianId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Payout.find(query).sort(sortObj).skip(skip).limit(lim),
    Payout.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * Per-job earnings history for the technician app's Recent Earnings screen.
 *
 * The EarningsTally is only a running total, so the individual lines come from
 * the jobs themselves — billing.technicianEarnings is what the technician was
 * credited for each completed job. Jobs that earned nothing (fully covered AMC
 * visits with no chargeable work) are still listed: the technician did the
 * visit, and hiding it would look like missing history.
 */
export async function listRecentEarnings(technicianId, { page, limit } = {}) {
  const query = { technician: technicianId, activeStep: 'completed' };
  const { skip, limit: lim, page: pg } = parsePagination({ page, limit, sort: '-updatedAt' });

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .populate({ path: 'serviceRequest', select: 'category description humanId' })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(lim),
    Job.countDocuments(query),
  ]);

  const items = jobs.map((job) => ({
    id: job.id,
    title: job.serviceRequest?.category
      ? `${job.serviceRequest.category} — ${job.type}`
      : job.type,
    reference: job.serviceRequest?.humanId || null,
    type: job.type,
    amount: job.billingEstimate?.technicianEarnings || 0,
    paymentMethod: job.paymentMethod || null,
    completedAt: job.updatedAt,
  }));

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * The technician app's Analytics screen: performance over a rolling window, plus
 * the same window immediately before it for the change figures.
 *
 * Completion rate is jobs reaching 'completed' as a share of jobs assigned in
 * the window. The category split comes from each job's ServiceRequest, which is
 * where the appliance category actually lives.
 */
export async function getTechnicianAnalytics(technicianId, { days = 30 } = {}) {
  // UTC throughout — the daily buckets below are keyed by toISOString(), so a
  // local-time window would drop the current day whenever the two dates differ.
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const prevEnd = new Date(start);
  prevEnd.setUTCMilliseconds(-1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));
  prevStart.setUTCHours(0, 0, 0, 0);

  async function windowStats(from, to) {
    const jobs = await Job.find({ technician: technicianId, createdAt: { $gte: from, $lte: to } })
      .populate({ path: 'serviceRequest', select: 'category' });

    const completed = jobs.filter((j) => j.activeStep === 'completed');
    return {
      earnings: completed.reduce((sum, j) => sum + (j.billingEstimate?.technicianEarnings || 0), 0),
      completedCount: completed.length,
      assignedCount: jobs.length,
      completionRate: jobs.length ? Math.round((completed.length / jobs.length) * 100) : null,
      completedJobs: completed,
    };
  }

  const [current, previous, technician] = await Promise.all([
    windowStats(start, end),
    windowStats(prevStart, prevEnd),
    Technician.findById(technicianId).select('rating weeklyTargetAmount'),
  ]);

  // Category mix over completed jobs in the window.
  const counts = {};
  for (const job of current.completedJobs) {
    const key = job.serviceRequest?.category || 'Other';
    counts[key] = (counts[key] || 0) + 1;
  }
  const totalCategorised = Object.values(counts).reduce((a, b) => a + b, 0);
  const byCategory = Object.entries(counts)
    .map(([label, count]) => ({ label, count, percent: Math.round((count / totalCategorised) * 100) }))
    .sort((a, b) => b.count - a.count);

  // Null rather than 0% when there is no baseline to compare against.
  const delta = (now, before) => (before > 0 ? Number((((now - before) / before) * 100).toFixed(1)) : null);

  // Daily earnings across the window, for the Income Trends chart. Days with no
  // completed job are present with zero so the bars line up with the calendar.
  const dailyMap = {};
  for (const job of current.completedJobs) {
    const key = new Date(job.updatedAt).toISOString().slice(0, 10);
    dailyMap[key] = (dailyMap[key] || 0) + (job.billingEstimate?.technicianEarnings || 0);
  }
  const daily = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ date: key, amount: dailyMap[key] || 0 });
  }

  return {
    days,
    daily,
    weeklyTargetAmount: technician?.weeklyTargetAmount || 0,
    earnings: current.earnings,
    earningsChangePercent: delta(current.earnings, previous.earnings),
    completedCount: current.completedCount,
    completedChangePercent: delta(current.completedCount, previous.completedCount),
    completionRate: current.completionRate,
    previousCompletionRate: previous.completionRate,
    rating: technician?.rating || 0,
    byCategory,
  };
}

/**
 * The figures the technician's Profile and Earnings screens show.
 *
 * `available` is the withdrawable balance (EarningsTally.total, which payouts
 * debit). `lifetimeEarned` adds back everything already paid out, since the
 * tally alone under-reports what the technician has actually earned.
 *
 * The Quick/Invoice split is by job type rather than by Payout rows: it covers
 * work that has been completed but not yet withdrawn, which is what the two
 * cards on those screens are describing.
 */
export async function getEarningsBreakdown(technicianId) {
  const [tally, paidOutRows, jobs] = await Promise.all([
    getEarningsSummary(technicianId),
    Payout.aggregate([
      { $match: { technician: new mongoose.Types.ObjectId(String(technicianId)), status: 'Settled' } },
      { $group: { _id: null, base: { $sum: '$baseAmount' }, net: { $sum: '$netAmount' } } },
    ]),
    Job.find({ technician: technicianId, activeStep: 'completed' }).select('type billingEstimate'),
  ]);

  const split = { quick: { amount: 0, jobs: 0 }, invoice: { amount: 0, jobs: 0 } };
  for (const job of jobs) {
    const bucket = job.type === 'NCC Paid Service' ? split.quick : split.invoice;
    bucket.amount += job.billingEstimate?.technicianEarnings || 0;
    bucket.jobs += 1;
  }

  const withdrawn = paidOutRows[0]?.base || 0;
  const paidOut = paidOutRows[0]?.net || 0;
  return {
    available: tally.total,
    today: tally.today,
    completedToday: tally.completedToday,
    completedTotal: tally.completedTotal,
    paidOut,
    lifetimeEarned: tally.total + withdrawn,
    split,
  };
}

/**
 * Credits the configured visit fee for a job the technician travelled to but
 * could not complete (customer cancelled, or was not available).
 *
 * Idempotent per job: the EarningsTally is the running balance and a second
 * call would silently pay twice, so the Payout row for this job is the guard.
 * Returns { credited: false } rather than throwing when the fee is disabled —
 * a zero fee is a valid configuration, not an error.
 */
export async function creditVisitFee(technicianId, jobId) {
  const job = await Job.findById(jobId);
  if (!job) throw new ApiError(404, 'Job not found');
  if (String(job.technician) !== String(technicianId)) {
    throw new ApiError(403, 'Not authorized to access this job');
  }
  if (job.activeStep === 'completed') {
    throw new ApiError(409, 'This job was completed — its earnings are billed through the invoice');
  }

  const settings = await PlatformSettings.findOne();
  const amount = settings?.visitFeeAmount ?? 150;
  if (amount <= 0) return { credited: false, amount: 0 };

  const existing = await Payout.findOne({ technician: technicianId, job: jobId, payoutType: 'Visit' });
  if (existing) return { credited: false, amount: existing.netAmount, alreadyCredited: true };

  const payout = await Payout.create({
    technician: technicianId,
    job: jobId,
    baseAmount: amount,
    platformFee: 0,
    netAmount: amount,
    payoutType: 'Visit',
    status: 'Pending',
  });

  await EarningsTally.findOneAndUpdate(
    { technician: technicianId },
    { $inc: { total: amount, today: amount } },
    { upsert: true, new: true },
  );

  return { credited: true, amount, payoutId: payout.id };
}
