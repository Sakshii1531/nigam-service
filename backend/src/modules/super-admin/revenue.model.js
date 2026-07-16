import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Aggregated commission/margin reporting rows (one per source per period),
// built by a Phase 8 reporting job rather than written per-transaction.
const revenueSchema = new mongoose.Schema(
  {
    source: { type: String, required: true }, // e.g. "Bookings", "AMC", "Extended Warranty"
    periodStart: Date,
    periodEnd: Date,
    gross: { type: Number, required: true },
    partnerShare: { type: Number, default: 0 },
    marginPercent: Number,
    net: { type: Number, required: true },
  },
  { timestamps: true },
);

applyStandardPlugins(revenueSchema);

export const Revenue = mongoose.models.Revenue || mongoose.model('Revenue', revenueSchema);
