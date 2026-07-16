import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Feeds pricingEngine (Phase 2 shared service) when generating invoices/estimates.
const rateCardSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    category: { type: String, required: true },
    serviceType: { type: String, required: true },
    laborRate: { type: Number, required: true },
    partsMarkupPercent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

rateCardSchema.index({ brand: 1, category: 1, serviceType: 1 }, { unique: true });

// totalBase (laborRate + laborRate * partsMarkupPercent / 100) is a display-time
// computation in the frontend's CallRatesCharges.jsx, not stored — keeps it from
// drifting out of sync if laborRate/partsMarkupPercent are edited independently.
rateCardSchema.virtual('totalBase').get(function totalBase() {
  return this.laborRate + (this.laborRate * this.partsMarkupPercent) / 100;
});

applyStandardPlugins(rateCardSchema);

export const RateCard = mongoose.models.RateCard || mongoose.model('RateCard', rateCardSchema);
