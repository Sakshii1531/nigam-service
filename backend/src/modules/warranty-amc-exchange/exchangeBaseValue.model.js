import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// What a given make/model is worth as a trade-in before the condition questions
// deduct from it. This was a `modelBaseValues` object shipped in the customer
// bundle, so the money a customer was offered came from the browser and could
// not be changed without a redeploy — and the super-admin console had no way to
// see or set it.
const exchangeBaseValueSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, index: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    baseValue: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// One row per physical model, so an admin edit updates rather than duplicates.
exchangeBaseValueSchema.index({ category: 1, brand: 1, model: 1 }, { unique: true });

applyStandardPlugins(exchangeBaseValueSchema);

export const ExchangeBaseValue =
  mongoose.models.ExchangeBaseValue || mongoose.model('ExchangeBaseValue', exchangeBaseValueSchema);
