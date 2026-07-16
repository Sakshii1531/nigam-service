import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const exchangeProductConfigSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    exchangeEnabled: { type: Boolean, default: true },
    supportedCategories: [String],
    questionSet: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeQuestionSet', default: null },
    badgeText: String,
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeCampaign', default: null },
    maxValue: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(exchangeProductConfigSchema);

export const ExchangeProductConfig =
  mongoose.models.ExchangeProductConfig || mongoose.model('ExchangeProductConfig', exchangeProductConfigSchema);
