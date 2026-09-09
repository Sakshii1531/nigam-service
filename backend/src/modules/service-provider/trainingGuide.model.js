import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const trainingGuideSchema = new mongoose.Schema(
  {
    // Null means platform-wide content owned by super-admin; a brand id means
    // the brand authored it for technicians servicing its own appliances.
    // Technicians read both — they work across brands.
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
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
