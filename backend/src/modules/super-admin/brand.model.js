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

    // ── Partner Warranty (docs/partner-warranty) ──
    logoUrl: { type: String, default: null },
    // Listed in the customer app's Partner Warranty flow only when true.
    warrantyEnabled: { type: Boolean, default: false, index: true },
    // Master Catalogue categories (the customer's "Product" step: AC,
    // Refrigerator, …) this brand accepts warranty claims for.
    coverage: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    // Stage deadlines in hours; unset → platform defaults.
    warrantySla: {
      approvalHours: Number,
      assignmentHours: Number,
      visitHours: Number,
      resolutionHours: Number,
    },
    // Outgoing CRM webhook (Phase 10). The secret is never returned by reads.
    webhook: {
      url: String,
      secret: { type: String, select: false },
      enabled: { type: Boolean, default: false },
      events: [String],
    },
  },
  { timestamps: true },
);

applyStandardPlugins(brandSchema);

export const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);
