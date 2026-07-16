import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const paymentMethodSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['card', 'upi', 'netbanking'], required: true },
    maskedDetail: String, // e.g. "•••• 4321", "user@upi"
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

applyStandardPlugins(paymentMethodSchema);

export const PaymentMethod = mongoose.models.PaymentMethod || mongoose.model('PaymentMethod', paymentMethodSchema);
