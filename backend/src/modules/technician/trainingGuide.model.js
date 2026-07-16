import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const trainingGuideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['PDF', 'Video'], required: true },
    product: String,
    url: String,
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(trainingGuideSchema, { prefix: ID_PREFIXES.GUIDE });

export const TrainingGuide = mongoose.models.TrainingGuide || mongoose.model('TrainingGuide', trainingGuideSchema);
