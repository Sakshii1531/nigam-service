import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Segments are always edited/read as one set (probabilities must sum <= 100,
// validated in the super-admin service layer in Phase 8) — embedding avoids a
// collection of rows that only ever make sense together.
const segmentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    probability: { type: Number, required: true },
    winningType: { type: String, enum: ['money', 'coins', 'spin', 'none'], default: 'none' },
    value: { type: Number, default: 0 },
    reward: String,
  },
  { _id: false },
);

const spinWheelConfigSchema = new mongoose.Schema(
  {
    segments: [segmentSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

applyStandardPlugins(spinWheelConfigSchema);

export const SpinWheelConfig = mongoose.models.SpinWheelConfig || mongoose.model('SpinWheelConfig', spinWheelConfigSchema);
