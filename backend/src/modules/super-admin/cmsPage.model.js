import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const cmsPageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true }, // e.g. "privacy-policy", "terms-and-conditions", "faqs", "about-us"
    title: String,
    subtitle: String,
    body: String,
    version: { type: String, default: 'v1.0' },
    contactEmail: { type: String, default: 'support@nccservice.in' },
    stats: [
      {
        label: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    sections: [
      {
        heading: { type: String, required: true },
        text: { type: String, required: true },
        order: { type: Number, default: 0 },
      },
    ],
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        category: { type: String, default: 'General' },
      },
    ],
    publishedAt: Date,
  },
  { timestamps: true },
);

applyStandardPlugins(cmsPageSchema);

export const CMSPage = mongoose.models.CMSPage || mongoose.model('CMSPage', cmsPageSchema);
