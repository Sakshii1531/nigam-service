import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { dimensionSchema } from './dimension.schema.js';
import { watchCatalogueWrites } from './catalogCache.js';

// The work itself — "Installation" under AC, "Fan Installation" under
// Electrician. Deliberately has no price: what a job costs depends on the exact
// (product type, variant, service) combination, so price and payout live on
// ServiceOffering → OfferingRate.
const catalogServiceSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    slug: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    icon: String,
    desc: String,
    // Standalone services whose price depends on an option pick (water tank
    // size) declare the option here; the option values are Variant rows.
    optionDimension: { type: dimensionSchema, default: null },
    keywords: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

catalogServiceSchema.index({ category: 1, slug: 1 }, { unique: true });

applyStandardPlugins(catalogServiceSchema);
// Writes drop the cached customer category trees (catalogCache.js).
catalogServiceSchema.plugin(watchCatalogueWrites);

export const CatalogService =
  mongoose.models.CatalogService || mongoose.model('CatalogService', catalogServiceSchema);
