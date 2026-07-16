import { EarningsTally } from './earningsTally.model.js';
import { Payout } from './payout.model.js';
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
