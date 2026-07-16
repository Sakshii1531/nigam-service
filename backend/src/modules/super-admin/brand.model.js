import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    category: String,
    status: { type: String, enum: ['Active', 'Pending'], default: 'Pending', index: true },
    slaResolutionTimeHours: Number,
    slaAdherencePercent: Number,
    csat: Number,
    contractTerms: String,
  },
  { timestamps: true },
);

applyStandardPlugins(brandSchema);

export const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);
