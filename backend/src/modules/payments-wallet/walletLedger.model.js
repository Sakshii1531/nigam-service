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
  },
  { timestamps: true },
);

applyStandardPlugins(walletLedgerSchema);

export const WalletLedger = mongoose.models.WalletLedger || mongoose.model('WalletLedger', walletLedgerSchema);
