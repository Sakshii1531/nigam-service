import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// An AMC plan — the one "plan" product NCC sells (docs/master-catalogue
// Phase 12: membership plans were the same thing and were merged in). Every
// field the customer sees is admin-managed from Super Admin → Plans.
const amcPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "AC Gold AMC", "NCC Care Gold"
    tier: { type: String, default: '', trim: true }, // free label: Silver, Gold, Platinum, Diamond…
    description: { type: String, default: '' },
    // What the customer gets, one line each ("3 scheduled visits", "Free gas top-up").
    benefits: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    visitsTotal: { type: Number, required: true, min: 0 },
    durationMonths: { type: Number, default: 12, min: 1 },
    // Master Catalogue category key the plan covers ("AC", "Refrigerator");
    // null = any appliance.
    applianceCategory: { type: String, default: null, index: true },
    displayOrder: { type: Number, default: 0 },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(amcPlanSchema);

export const AMCPlan = mongoose.models.AMCPlan || mongoose.model('AMCPlan', amcPlanSchema);
