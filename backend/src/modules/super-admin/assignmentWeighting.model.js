import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Singleton-ish config doc for the Phase 8 auto-assignment scoring engine.
// Service layer must validate the four weights sum to 100.
const assignmentWeightingSchema = new mongoose.Schema(
  {
    proximityPercent: { type: Number, default: 40 },
    skillPercent: { type: Number, default: 30 },
    ratingPercent: { type: Number, default: 20 },
    workloadPercent: { type: Number, default: 10 },
  },
  { timestamps: true },
);

applyStandardPlugins(assignmentWeightingSchema);

export const AssignmentWeighting =
  mongoose.models.AssignmentWeighting || mongoose.model('AssignmentWeighting', assignmentWeightingSchema);
