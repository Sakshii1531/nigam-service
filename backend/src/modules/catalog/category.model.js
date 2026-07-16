import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Replaces frontend/src/data/bookingCatalog.js + the custom_service_*/custom_categories
// localStorage overrides. Written to by super-admin's CustomerAppCustomization
// endpoints (Phase 8), read by the customer app's catalog endpoints (Phase 4).
const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "AC", "Washing Machine"
    name: { type: String, required: true },
    icon: String,
    color: String,
    lightBg: String,
    categoryNote: String,
    bannerImg: String,
    tagline: String,
    subtitle: String,
    brands: [String], // simple list of brand names offered under this category's booking flow
    whyBrandPoints: [String],
    isForYou: { type: Boolean, default: false },
    isMore: { type: Boolean, default: false },
    isFridge: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(categorySchema);

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
