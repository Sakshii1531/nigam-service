import { User } from '../auth/user.model.js';
import { WalletLedger } from './walletLedger.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

/**
 * Debits `amount` coins from a user's wallet. Atomic at the single-document
 * level: `walletCoins: { $gte: amount }` in the filter means MongoDB only
 * applies the $inc if the balance is still sufficient *at the moment the
 * update executes* — two concurrent debits that would together overdraw the
 * balance can't both succeed, because MongoDB serializes writes to the same
 * document. This is not a multi-document Mongo transaction (order/payment
 * creation happens in separate writes right after) — see DATA_MODEL.md Phase 5
 * addendum for why, and what that tradeoff actually costs.
 */
export async function redeemCoins(userId, amount, { reason = 'redeemed', payment = null } = {}) {
  if (amount <= 0) throw new ApiError(400, 'Redemption amount must be positive');

  const user = await User.findOneAndUpdate(
    { _id: userId, walletCoins: { $gte: amount } },
    { $inc: { walletCoins: -amount } },
    { new: true },
  );
  if (!user) throw new ApiError(400, 'Insufficient wallet balance');

  return WalletLedger.create({ user: userId, delta: -amount, reason, balanceAfter: user.walletCoins, payment });
}

export async function creditCoins(userId, amount, { reason = 'earned', payment = null } = {}) {
  if (amount <= 0) throw new ApiError(400, 'Credit amount must be positive');

  const user = await User.findOneAndUpdate({ _id: userId }, { $inc: { walletCoins: amount } }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');

  return WalletLedger.create({ user: userId, delta: amount, reason, balanceAfter: user.walletCoins, payment });
}

export async function getBalance(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user.walletCoins;
}

export async function getLedger(userId, { page, limit, sort } = {}) {
  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    WalletLedger.find({ user: userId }).sort(sortObj).skip(skip).limit(lim),
    WalletLedger.countDocuments({ user: userId }),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}
