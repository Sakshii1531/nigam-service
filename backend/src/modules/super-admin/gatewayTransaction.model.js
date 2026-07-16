import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Raw payment-gateway transaction log (Razorpay etc.), distinct from the app-level
// Payment record (src/modules/payments-wallet/payment.model.js) — this is what
// super-admin's Transactions.jsx reconciles against.
const gatewayTransactionSchema = new mongoose.Schema(
  {
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    ref: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    gateway: { type: String, enum: ['UPI', 'Card', 'NetBanking'], required: true },
    status: { type: String, enum: ['Success', 'Failed', 'Refunded'], default: 'Success', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(gatewayTransactionSchema);

export const GatewayTransaction = mongoose.models.GatewayTransaction || mongoose.model('GatewayTransaction', gatewayTransactionSchema);
