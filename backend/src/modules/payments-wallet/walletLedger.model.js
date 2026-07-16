import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Append-only ledger — User.walletCoins is a running cache of the sum of these,
// kept in sync inside the same Mongo transaction as the ledger write (Phase 5).
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
