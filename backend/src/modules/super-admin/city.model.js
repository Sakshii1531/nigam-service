import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Referenced first (no deps) since Technician/Brand/ServicePartner all point at it.
const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    state: String,
    district: String,
    coverageAreaSqkm: Number,
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  },
  { timestamps: true },
);

citySchema.index({ name: 1, state: 1 }, { unique: true });

applyStandardPlugins(citySchema);

export const City = mongoose.models.City || mongoose.model('City', citySchema);
