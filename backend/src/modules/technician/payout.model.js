import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const payoutSchema = new mongoose.Schema(
  {
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    baseAmount: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    payoutType: { type: String, enum: ['Quick', 'Invoice', 'Visit'], default: 'Quick' },
    status: { type: String, enum: ['Settled', 'Pending'], default: 'Pending', index: true },
    creditedTo: String, // masked bank/UPI detail, snapshot at payout time
    transactionId: String,
  },
  { timestamps: true },
);

applyStandardPlugins(payoutSchema);

export const Payout = mongoose.models.Payout || mongoose.model('Payout', payoutSchema);
