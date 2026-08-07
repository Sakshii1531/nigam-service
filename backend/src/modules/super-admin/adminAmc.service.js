import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Platform-wide AMC view for the super-admin console. The customer-facing
// /warranty-amc/amc/subscriptions is scoped to req.user, so the console cannot
// use it — an admin would see only their own contracts.

const EXPIRING_WINDOW_DAYS = 7;

export async function listSubscriptions({ status, page, limit, sort } = {}) {
  const query = {};
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    AMCSubscription.find(query)
      .populate('user', 'name phone email')
      .populate('plan', 'name price')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    AMCSubscription.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * The four console tiles. Counted across every subscription rather than the
 * current page, so the figures don't change as the operator pages through.
 *
 * `totalSales` is the sum of the plan prices actually subscribed to — the
 * subscription itself stores no amount, so an orphaned plan ref contributes
 * zero rather than dropping the row from the count.
 */
export async function getSummary() {
  const expiringBefore = new Date();
  expiringBefore.setDate(expiringBefore.getDate() + EXPIRING_WINDOW_DAYS);

  const [salesRows, statusRows, planRows, expiringSoon] = await Promise.all([
    AMCSubscription.aggregate([
      { $lookup: { from: 'amcplans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
      { $group: { _id: null, total: { $sum: { $ifNull: [{ $first: '$planDoc.price' }, 0] } } } },
    ]),
    AMCSubscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    AMCSubscription.aggregate([
      { $lookup: { from: 'amcplans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
      { $group: { _id: { $first: '$planDoc.name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    AMCSubscription.countDocuments({ status: { $ne: 'Expired' }, expiryDate: { $lte: expiringBefore, $gte: new Date() } }),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.count]));

  return {
    totalSales: salesRows[0]?.total || 0,
    activeContracts: byStatus.Active || 0,
    // Null rather than a placeholder name when nothing has been sold yet.
    mostSoldPlan: planRows[0]?._id || null,
    expiringSoon,
    expiringWindowDays: EXPIRING_WINDOW_DAYS,
  };
}
