import { BillingTransaction } from './billingTransaction.model.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { logAudit } from '../shared/auditLog.js';

// Platform-side money movements — what the business charged, paid out, shared
// with a brand, or refunded. The counterparty is a User of any role (a customer
// paying a service fee, a technician receiving a payout, a brand admin taking a
// share), which is why `user` is a plain User ref and not role-scoped.

// Money leaving the platform vs money coming in. Used for the console's totals.
const OUTFLOW_TYPES = ['Payout', 'Brand Share', 'Refund'];

export async function listBillingTransactions({ type, status, user, page, limit, sort } = {}) {
  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;
  if (user) query.user = user;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    BillingTransaction.find(query)
      .populate('user', 'name email role')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    BillingTransaction.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** Totals across the filtered set — only settled ('Paid') rows count as real money. */
export async function getBillingSummary({ type, user } = {}) {
  const query = { status: 'Paid' };
  if (type) query.type = type;
  if (user) query.user = user;

  const rows = await BillingTransaction.aggregate([
    { $match: query },
    { $group: { _id: '$type', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const byType = Object.fromEntries(rows.map((r) => [r._id, r.amount]));
  const inflow = byType['Service Fee'] || 0;
  const outflow = OUTFLOW_TYPES.reduce((sum, t) => sum + (byType[t] || 0), 0);

  return {
    inflow,
    outflow,
    net: inflow - outflow,
    byType,
    count: rows.reduce((sum, r) => sum + r.count, 0),
  };
}

async function findOr404(id) {
  const txn = await BillingTransaction.findById(id);
  if (!txn) throw new ApiError(404, 'Billing transaction not found');
  return txn;
}

export async function getBillingTransaction(id) {
  const txn = await findOr404(id);
  return txn.populate('user', 'name email role');
}

export async function createBillingTransaction({ user, amount, type, status, description }) {
  const exists = await User.exists({ _id: user });
  if (!exists) throw new ApiError(404, 'User not found');

  const txn = await BillingTransaction.create({ user, amount, type, status, description });
  return txn.populate('user', 'name email role');
}

/**
 * Move a transaction between Pending / Paid / Failed.
 *
 * A settled transaction is terminal: re-opening one would let the same money be
 * counted twice by getBillingSummary, which only sums 'Paid' rows.
 */
export async function updateBillingStatus(id, status, actingUserId) {
  const txn = await findOr404(id);
  if (txn.status === 'Paid' && status !== 'Paid') {
    throw new ApiError(409, 'A settled transaction cannot be re-opened');
  }

  const previous = txn.status;
  txn.status = status;
  await txn.save();

  if (previous !== status) {
    await logAudit({
      user: actingUserId,
      action: `Billing transaction ${txn.id} moved from ${previous} to ${status}`,
      type: 'Finance',
    });
  }

  return txn.populate('user', 'name email role');
}
