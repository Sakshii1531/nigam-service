import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Per-category booking configuration: what the customer picks their way through
// after choosing a category on the home screen.
//
// The console has always captured this (product types, brands, the "why brand"
// bullets) but kept it in localStorage, so the booking flow never saw it. One
// document per category, mirroring ServicePageConfig's shape for services.
const productTypeSchema = new mongoose.Schema(
  { _id: false, id: String, name: String, icon: String, desc: String },
  { _id: false },
);

const categoryBookingConfigSchema = new mongoose.Schema(
  {
    // The category name as the home screen shows it, e.g. 'AC'.
    categoryName: { type: String, required: true, unique: true, index: true },
    productTypes: [productTypeSchema],
    // Service options keyed by product type, with a `default` fallback list —
    // Mixed because the key set is whatever product types the category defines.
    services: { type: mongoose.Schema.Types.Mixed, default: {} },
    brands: [String],
    whyBrandPoints: [String],
    categoryNote: String,
  },
  { timestamps: true },
);

applyStandardPlugins(categoryBookingConfigSchema);

export const CategoryBookingConfig =
  mongoose.models.CategoryBookingConfig ||
  mongoose.model('CategoryBookingConfig', categoryBookingConfigSchema);
