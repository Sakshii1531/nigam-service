import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const storySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['Promo Banner', 'Customer Help Slider', 'Informational'], required: true },
    mediaUrl: String,
    aspectRatio: String,
    clicks: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Scheduled'], default: 'Active', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(storySchema);

export const Story = mongoose.models.Story || mongoose.model('Story', storySchema);
