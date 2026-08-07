import { GatewayTransaction } from './gatewayTransaction.model.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { logAudit } from '../shared/auditLog.js';

// Raw gateway log (Razorpay et al.), separate from the app-level Payment record.
// This is the side the console reconciles against, so rows are append-mostly:
// the only permitted mutation is marking a successful charge as refunded.

export async function listGatewayTransactions({ gateway, status, customer, ref, page, limit, sort } = {}) {
  const query = {};
  if (gateway) query.gateway = gateway;
  if (status) query.status = status;
  if (customer) query.customer = customer;
  if (ref) query.ref = ref;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    GatewayTransaction.find(query)
      .populate('customer', 'name email phone')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    GatewayTransaction.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** Settled/failed/refunded split across the filtered set. */
export async function getTransactionSummary({ gateway, customer } = {}) {
  const query = {};
  if (gateway) query.gateway = gateway;
  if (customer) query.customer = customer;

  const rows = await GatewayTransaction.aggregate([
    { $match: query },
    { $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const byStatus = Object.fromEntries(rows.map((r) => [r._id, r]));
  const succeeded = byStatus.Success?.amount || 0;
  const refunded = byStatus.Refunded?.amount || 0;
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return {
    succeededAmount: succeeded,
    refundedAmount: refunded,
    // Refunded charges are excluded from the collected figure — the money went back.
    netCollected: succeeded,
    successCount: byStatus.Success?.count || 0,
    failedCount: byStatus.Failed?.count || 0,
    refundedCount: byStatus.Refunded?.count || 0,
    totalCount: total,
    // Failed attempts are the signal worth watching on a reconciliation screen.
    failureRatePercent: total === 0 ? 0 : Math.round(((byStatus.Failed?.count || 0) / total) * 100),
  };
}

async function findOr404(id) {
  const txn = await GatewayTransaction.findById(id);
  if (!txn) throw new ApiError(404, 'Gateway transaction not found');
  return txn;
}

export async function getGatewayTransaction(id) {
  const txn = await findOr404(id);
  return txn.populate('customer', 'name email phone');
}

export async function createGatewayTransaction({ ref, customer, amount, gateway, status, payment }) {
  const exists = await User.exists({ _id: customer });
  if (!exists) throw new ApiError(404, 'Customer not found');

  // `ref` is the gateway's own identifier and is uniquely indexed — surface the
  // clash as a 409 rather than letting the driver's E11000 become a 500.
  const duplicate = await GatewayTransaction.findOne({ ref });
  if (duplicate) throw new ApiError(409, `A transaction with ref "${ref}" already exists`);

  const txn = await GatewayTransaction.create({ ref, customer, amount, gateway, status, payment: payment || null });
  return txn.populate('customer', 'name email phone');
}

/**
 * Mark a successful charge as refunded. Only Success -> Refunded is allowed:
 * a failed charge never took money, so there is nothing to send back, and
 * refunding twice would double-count against netCollected.
 */
export async function refundTransaction(id, actingUserId) {
  const txn = await findOr404(id);
  if (txn.status === 'Refunded') throw new ApiError(409, 'Transaction is already refunded');
  if (txn.status !== 'Success') throw new ApiError(400, 'Only a successful transaction can be refunded');

  txn.status = 'Refunded';
  await txn.save();

  await logAudit({
    user: actingUserId,
    action: `Refunded gateway transaction ${txn.ref} for ${txn.amount}`,
    type: 'Finance',
  });

  return txn.populate('customer', 'name email phone');
}
