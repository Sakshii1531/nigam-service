import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const cmsPageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true }, // e.g. "privacy-policy", "terms", "faqs"
    body: String,
    publishedAt: Date,
  },
  { timestamps: true },
);

applyStandardPlugins(cmsPageSchema);

export const CMSPage = mongoose.models.CMSPage || mongoose.model('CMSPage', cmsPageSchema);
