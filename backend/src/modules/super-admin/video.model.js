import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: String,
    duration: String,
    sizeBytes: Number,
    views: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

applyStandardPlugins(videoSchema);

export const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);
