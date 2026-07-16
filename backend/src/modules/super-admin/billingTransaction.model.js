import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const billingTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['Service Fee', 'Payout', 'Brand Share', 'Refund'], required: true },
    status: { type: String, enum: ['Paid', 'Pending', 'Failed'], default: 'Pending', index: true },
    description: String,
  },
  { timestamps: true },
);

applyStandardPlugins(billingTransactionSchema);

export const BillingTransaction = mongoose.models.BillingTransaction || mongoose.model('BillingTransaction', billingTransactionSchema);
