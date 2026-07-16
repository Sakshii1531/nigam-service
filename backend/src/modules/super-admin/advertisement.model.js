import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const advertisementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['App Header Banner', 'Category Popup', 'Cart Bottom Banner'], required: true },
    budget: Number,
    clicks: { type: Number, default: 0 },
    status: { type: String, enum: ['Running', 'Paused'], default: 'Running', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(advertisementSchema);

export const Advertisement = mongoose.models.Advertisement || mongoose.model('Advertisement', advertisementSchema);
