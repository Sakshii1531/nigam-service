import mongoose from 'mongoose';
import { Job } from '../service-provider/job.model.js';
import { Payout } from '../service-provider/payout.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { logAudit } from '../shared/auditLog.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { ApiError } from '../../middleware/errorHandler.js';

// B2B2C (partner warranty) payouts — docs/partner-warranty Phase 11, client #20.
// A warranty job's payout (brand RateCard, frozen at accept) is not added to
// the partner's withdrawable balance; it waits as `settlement.status:
// 'unsettled'` until NCC settles it by hand, which records a settled Invoice
// payout. The partner sees totals, and totals by brand and by product.

const earningOf = (job) => job.billingEstimate?.serviceProviderEarnings ?? job.payout?.total ?? 0;
const oid = (id) => new mongoose.Types.ObjectId(String(id));

/** Completed B2B2C jobs, with the brand and product they were for. */
async function completedB2b2cJobs(filter) {
  const jobs = await Job.find({ ...filter, warrantyClaim: { $ne: null }, activeStep: 'completed' })
    .select('serviceProvider serviceRequest warrantyClaim billingEstimate payout settlement updatedAt')
    .populate({ path: 'serviceRequest', select: 'humanId category brand' })
    .populate({ path: 'warrantyClaim', select: 'humanId productName' })
    .sort({ updatedAt: -1 })
    .lean();
  const brandIds = [...new Set(jobs.map((j) => String(j.serviceRequest?.brand)).filter(Boolean))];
  const brands = await Brand.find({ _id: { $in: brandIds } }).select('name').lean();
  const nameOf = new Map(brands.map((b) => [String(b._id), b.name]));
  return jobs.map((j) => ({
    id: String(j._id),
    serviceProvider: String(j.serviceProvider),
    jobId: j.serviceRequest?.humanId || null,
    claimId: j.warrantyClaim?.humanId || null,
    brand: nameOf.get(String(j.serviceRequest?.brand)) || null,
    product: j.warrantyClaim?.productName || j.serviceRequest?.category || null,
    amount: earningOf(j),
    status: j.settlement?.status === 'settled' ? 'settled' : 'unsettled',
    settledAt: j.settlement?.settledAt || null,
    reference: j.settlement?.reference || null,
    completedAt: j.updatedAt,
  }));
}

function totals(rows) {
  return rows.reduce((acc, r) => ({ jobs: acc.jobs + 1, amount: acc.amount + r.amount }), { jobs: 0, amount: 0 });
}

function groupBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const k = r[key] || 'Other';
    const g = map.get(k) || { [key]: k, jobs: 0, amount: 0, pending: 0 };
    g.jobs += 1;
    g.amount += r.amount;
    if (r.status === 'unsettled') g.pending += r.amount;
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/** What the partner's Invoice Payout screen shows for B2B2C work. */
export async function partnerB2b2cSummary(serviceProviderId) {
  const rows = await completedB2b2cJobs({ serviceProvider: serviceProviderId });
  const all = totals(rows);
  return {
    ...all,
    settled: totals(rows.filter((r) => r.status === 'settled')),
    pending: totals(rows.filter((r) => r.status === 'unsettled')),
    byBrand: groupBy(rows, 'brand'),
    byProduct: groupBy(rows, 'product'),
    settlement: 'manual', // settled by NCC; not withdrawable from the app
  };
}

// ── Super Admin ──────────────────────────────────────────────────────────────

/** Unsettled B2B2C earnings per partner — the settlement worklist. */
export async function listUnsettledByPartner({ brand } = {}) {
  let rows = (await completedB2b2cJobs({ 'settlement.status': 'unsettled' })).filter((r) => r.status === 'unsettled');
  if (brand) {
    const b = await Brand.findById(brand).select('name').lean();
    rows = rows.filter((r) => r.brand === b?.name);
  }
  const byPartner = new Map();
  for (const r of rows) {
    const list = byPartner.get(r.serviceProvider) || [];
    list.push(r);
    byPartner.set(r.serviceProvider, list);
  }
  const providers = await ServiceProvider.find({ _id: { $in: [...byPartner.keys()] } }).select('name phone').lean();
  return providers
    .map((p) => {
      const list = byPartner.get(String(p._id));
      return {
        serviceProvider: { id: String(p._id), name: p.name, phone: p.phone || null },
        ...totals(list),
        oldestCompletedAt: list.reduce((min, r) => (r.completedAt < min ? r.completedAt : min), list[0].completedAt),
        byBrand: groupBy(list, 'brand'),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export async function listPartnerB2b2cJobs(serviceProviderId, { status } = {}) {
  const rows = await completedB2b2cJobs({ serviceProvider: serviceProviderId });
  return status ? rows.filter((r) => r.status === status) : rows;
}

/**
 * Records a manual settlement of `jobIds` for one partner: the jobs become
 * `settled` and one settled Invoice payout carries their total. Jobs are
 * claimed first with a conditional update, so two admins settling the same
 * job at once can never pay it twice.
 */
export async function settle(actorId, { serviceProviderId, jobIds, reference, note }) {
  const ids = [...new Set(jobIds.map(String))];
  const provider = await ServiceProvider.findById(serviceProviderId).select('name user payoutMethods').lean();
  if (!provider) throw new ApiError(404, 'Service partner not found');

  const jobs = await Job.find({ _id: { $in: ids } }).select('serviceProvider warrantyClaim activeStep settlement billingEstimate payout').lean();
  if (jobs.length !== ids.length) throw new ApiError(404, 'One or more jobs were not found');
  for (const job of jobs) {
    if (String(job.serviceProvider) !== String(serviceProviderId)) throw new ApiError(400, 'Every job must belong to this partner');
    if (!job.warrantyClaim) throw new ApiError(400, 'Only partner warranty (B2B2C) jobs are settled here');
    if (job.activeStep !== 'completed') throw new ApiError(400, 'Only completed jobs can be settled');
    if (job.settlement?.status !== 'unsettled') throw new ApiError(409, 'One or more jobs are already settled');
  }

  const settledAt = new Date();
  // timestamps: false — the history screens read updatedAt as "completed at".
  const claimed = await Job.updateMany(
    { _id: { $in: ids.map(oid) }, 'settlement.status': 'unsettled' },
    { $set: { 'settlement.status': 'settled', 'settlement.settledAt': settledAt, 'settlement.reference': reference } },
    { timestamps: false },
  );
  if (claimed.modifiedCount !== ids.length) {
    // Someone else settled part of this batch at the same moment — undo ours.
    await Job.updateMany(
      { _id: { $in: ids.map(oid) }, 'settlement.settledAt': settledAt },
      { $set: { 'settlement.status': 'unsettled', 'settlement.settledAt': null, 'settlement.reference': null } },
      { timestamps: false },
    );
    throw new ApiError(409, 'One or more jobs were settled by someone else just now — reload and try again');
  }

  const amount = jobs.reduce((sum, j) => sum + earningOf(j), 0);
  const method = provider.payoutMethods?.find((m) => m.isPrimary) || provider.payoutMethods?.[0];
  const payout = await Payout.create({
    serviceProvider: serviceProviderId,
    baseAmount: amount,
    platformFee: 0,
    netAmount: amount,
    payoutType: 'Invoice',
    status: 'Settled',
    creditedTo: method?.detail || null,
    transactionId: reference,
  });
  await Job.updateMany({ _id: { $in: ids.map(oid) } }, { $set: { 'settlement.payout': payout._id } }, { timestamps: false });

  await logAudit({
    user: actorId,
    type: 'Finance',
    action: `B2B2C payout settled for ${provider.name}: ₹${amount} across ${ids.length} job(s), ref ${reference}${note ? ` — ${note}` : ''}`,
  });
  if (provider.user) {
    await emitNotification('b2b2c.payout_settled', {
      user: provider.user,
      amount,
      jobs: ids.length,
      reference,
      cta: { label: 'View Earnings', route: '/service-provider/earnings?tab=invoice' },
    });
  }

  return { payoutId: String(payout._id), serviceProviderId: String(serviceProviderId), jobs: ids.length, amount, reference, settledAt };
}
