import mongoose from 'mongoose';

const cmsPageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true }, // e.g. "privacy-policy", "terms", "faqs"
    body: String,
    publishedAt: Date,
  },
  { timestamps: true },
);

export const CMSPage = mongoose.models.CMSPage || mongoose.model('CMSPage', cmsPageSchema);
