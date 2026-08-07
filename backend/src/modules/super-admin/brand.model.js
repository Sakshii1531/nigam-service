import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    category: String,
    status: { type: String, enum: ['Active', 'Pending'], default: 'Pending', index: true },
    // Base warranty this brand offers on its appliances, in months. Falls back
    // to the platform default when unset.
    warrantyMonths: Number,
    // Support contact shown on the brand profile. The console derived these
    // from the brand name ("support@<name>.com", "+91 1800 …") and displayed a
    // fixed joined date, so an operator could act on a mailbox and a number
    // that were never real.
    supportEmail: String,
    supportPhone: String,
    // Contracted SLA targets. Distinct from the measured actuals returned by
    // getBrandSla — these are what was agreed, not what happened.
    slaResolutionTimeHours: Number,
    slaAdherencePercent: Number,
    csat: Number,
    contractTerms: String,
  },
  { timestamps: true },
);

applyStandardPlugins(brandSchema);

export const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);
