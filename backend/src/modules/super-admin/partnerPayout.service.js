import { PartnerPayout } from './partnerPayout.model.js';
import { ServicePartner } from './servicePartner.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { logAudit } from '../shared/auditLog.js';

// Money owed to a ServicePartner ("center"). Distinct from the technician-level
// Payout in modules/technician/payout.model.js — different payee, different
// cadence, settled by the platform rather than by the partner.

export async function listPartnerPayouts({ status, partner, city, page, limit, sort } = {}) {
  const query = {};
  if (status) query.status = status;
  if (partner) query.partner = partner;
  if (city) query.city = city;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    // The ledger names the partner and its region rather than showing ids.
    PartnerPayout.find(query)
      .populate('partner', 'name status')
      .populate('city', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    PartnerPayout.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** Outstanding vs settled totals across the whole filtered set. */
export async function getPayoutSummary({ partner, city } = {}) {
  const query = {};
  if (partner) query.partner = partner;
  if (city) query.city = city;

  const rows = await PartnerPayout.aggregate([
    { $match: query },
    { $group: { _id: '$status', balance: { $sum: '$balance' }, count: { $sum: 1 } } },
  ]);

  const byStatus = Object.fromEntries(rows.map((r) => [r._id, r]));
  return {
    pendingAmount: byStatus['Pending Approval']?.balance || 0,
    pendingCount: byStatus['Pending Approval']?.count || 0,
    paidCount: byStatus.Paid?.count || 0,
    totalPartners: rows.reduce((sum, r) => sum + r.count, 0),
  };
}

async function findOr404(id) {
  const payout = await PartnerPayout.findById(id);
  if (!payout) throw new ApiError(404, 'Partner payout not found');
  return payout;
}

export async function getPartnerPayout(id) {
  const payout = await findOr404(id);
  return payout.populate([{ path: 'partner', select: 'name status' }, { path: 'city', select: 'name' }]);
}

export async function createPartnerPayout({ partner, city, balance }) {
  const exists = await ServicePartner.findById(partner);
  if (!exists) throw new ApiError(404, 'Service partner not found');

  // Default the region to the partner's own city when none is given, so the
  // ledger stays filterable without the caller having to repeat it.
  const payout = await PartnerPayout.create({ partner, city: city || exists.city || null, balance });
  return payout.populate([{ path: 'partner', select: 'name status' }, { path: 'city', select: 'name' }]);
}

/** Add newly-earned money onto an existing pending payout. */
export async function accrueBalance(id, amount) {
  const payout = await findOr404(id);
  if (payout.status === 'Paid') {
    // A settled row is a closed record; new earnings belong on a fresh one.
    throw new ApiError(409, 'Cannot accrue onto an already-settled payout — create a new one');
  }
  payout.balance += amount;
  await payout.save();
  return payout.populate([{ path: 'partner', select: 'name status' }, { path: 'city', select: 'name' }]);
}

/**
 * Settle a payout: records what was disbursed, zeroes the outstanding balance
 * and stamps the date. Refuses to settle twice — that would silently double-pay.
 */
export async function markPaid(id, actingUserId) {
  const payout = await findOr404(id);
  if (payout.status === 'Paid') throw new ApiError(409, 'Payout is already settled');
  if (payout.balance <= 0) throw new ApiError(400, 'Nothing outstanding to settle');

  const settled = payout.balance;
  payout.lastPaidAmount = settled;
  payout.lastPaidAt = new Date();
  payout.balance = 0;
  payout.status = 'Paid';
  await payout.save();

  await logAudit({
    user: actingUserId,
    action: `Settled partner payout ${payout.id} for ${settled}`,
    type: 'Finance',
  });

  return payout.populate([{ path: 'partner', select: 'name status' }, { path: 'city', select: 'name' }]);
}
