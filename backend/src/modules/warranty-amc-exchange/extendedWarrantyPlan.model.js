import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// The purchasable extended-warranty packs, mirroring AMCPlan. These used to be a
// hardcoded array in ExtendWarranty.jsx with the client posting its own
// `amountPaid` — meaning the price charged was whatever the browser said. The
// order endpoint now prices from this collection.
const extendedWarrantyPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    durationYears: { type: Number, required: true },
    price: { type: Number, required: true },
    description: String,
    features: [String],
    // Master Catalogue category key the pack covers ("AC", "TV"); null = any
    // appliance. Admin-managed from Super Admin → Plans (docs/master-catalogue Phase 13).
    applianceCategory: { type: String, default: null, index: true },
    displayOrder: { type: Number, default: 0 },
    isPopular: { type: Boolean, default: false },
    claimsTotal: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(extendedWarrantyPlanSchema);

export const ExtendedWarrantyPlan =
  mongoose.models.ExtendedWarrantyPlan || mongoose.model('ExtendedWarrantyPlan', extendedWarrantyPlanSchema);
