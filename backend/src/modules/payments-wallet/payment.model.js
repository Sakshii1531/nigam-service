import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['booking', 'order', 'extended_warranty', 'amc', 'job'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['Card', 'UPI', 'NetBanking', 'Cash', 'Wallet'], required: true },
    status: { type: String, enum: ['Pending', 'Success', 'Failed', 'Refunded'], default: 'Pending', index: true },
    gatewayRef: String, // Razorpay payment/order id once Phase 5 wires the real client
    coinsRedeemed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

paymentSchema.index({ targetType: 1, targetId: 1 });

applyStandardPlugins(paymentSchema);

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
