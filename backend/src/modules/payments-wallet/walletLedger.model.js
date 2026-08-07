import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Append-only ledger — User.walletCoins is a running cache kept in sync via a
// single atomic findOneAndUpdate($inc + balance guard) in wallet.service.js,
// immediately followed by this ledger write. Not a multi-document Mongo
// transaction (the local dev mongod is standalone, not a replica set — see
// DATA_MODEL.md Phase 5 addendum for the tradeoff this accepts and why).
const walletLedgerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delta: { type: Number, required: true }, // +ve credit, -ve debit
    reason: {
      type: String,
      enum: ['earned', 'redeemed', 'referral', 'scratch_card', 'spin_wheel', 'refund'],
      required: true,
    },
    balanceAfter: { type: Number, required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    // Identifies a once-per-user reward (e.g. 'book_service'). Uniquely indexed
    // with `user` so the same task can never be claimed twice — the client used
    // to track this in localStorage, which clearing it defeated.
    claimKey: { type: String, default: null },
  },
  { timestamps: true },
);

walletLedgerSchema.index({ user: 1, claimKey: 1 }, { unique: true, partialFilterExpression: { claimKey: { $type: 'string' } } });

applyStandardPlugins(walletLedgerSchema);

export const WalletLedger = mongoose.models.WalletLedger || mongoose.model('WalletLedger', walletLedgerSchema);
