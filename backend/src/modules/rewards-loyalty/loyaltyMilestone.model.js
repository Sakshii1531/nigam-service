import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const loyaltyMilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    threshold: { type: Number, required: true }, // coins or jobs/orders count, interpreted by the service layer
    benefit: String,
    status: { type: String, enum: ['Locked', 'Unlocked'], default: 'Locked' },
  },
  { timestamps: true },
);

applyStandardPlugins(loyaltyMilestoneSchema);

export const LoyaltyMilestone = mongoose.models.LoyaltyMilestone || mongoose.model('LoyaltyMilestone', loyaltyMilestoneSchema);
