import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const exchangeRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: String,
    brand: String,
    model: String,
    condition: String,
    answers: { type: Map, of: String, default: {} },
    baseValue: { type: Number, default: 0 },
    deductionsAmount: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 },
    // estimatedValue = baseValue - deductionsAmount + bonusAmount (computed at valuation time,
    // stored rather than recomputed so a later config change can't retroactively alter a quoted value).
    estimatedValue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Pending Inspection', 'Inspection Approved', 'Defective Received', 'Received at WH'],
      default: 'Pending Inspection',
      index: true,
    },
    appliedToOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  },
  { timestamps: true },
);

applyStandardPlugins(exchangeRequestSchema, { prefix: ID_PREFIXES.EXCHANGE });

export const ExchangeRequest = mongoose.models.ExchangeRequest || mongoose.model('ExchangeRequest', exchangeRequestSchema);
