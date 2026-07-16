import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    segment: { type: String, enum: ['warranty', 'non-warranty'], default: 'non-warranty' },
    app: { type: String, enum: ['customer', 'technician'], default: 'customer', index: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(bannerSchema);

export const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
