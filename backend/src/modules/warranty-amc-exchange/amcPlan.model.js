import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const amcPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "AMC Gold Plan", "Silver AMC"
    tier: { type: String, enum: ['Silver', 'Gold', 'Platinum'], default: 'Silver' },
    price: { type: Number, required: true },
    visitsTotal: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

applyStandardPlugins(amcPlanSchema);

export const AMCPlan = mongoose.models.AMCPlan || mongoose.model('AMCPlan', amcPlanSchema);
