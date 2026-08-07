import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['booking', 'order', 'extended_warranty', 'amc', 'job', 'membership'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['Card', 'UPI', 'NetBanking', 'Cash', 'Wallet'], required: true },
    status: { type: String, enum: ['Pending', 'Success', 'Failed', 'Refunded'], default: 'Pending', index: true },
    // While Pending: holds the Razorpay Order id (set at initiate time, looked
    // up server-side at verify time — never trust a client-supplied order id
    // for signature verification, see paymentGateway.js). Once Success: stays
    // as the Order id for traceability; razorpayPaymentId below holds the
    // actual payment id Razorpay returns after the customer completes Checkout.
    gatewayRef: String,
    razorpayPaymentId: { type: String, default: null },
    coinsRedeemed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

paymentSchema.index({ targetType: 1, targetId: 1 });

applyStandardPlugins(paymentSchema);

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
