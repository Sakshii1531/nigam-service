import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { dimensionSchema } from './dimension.schema.js';
import { watchCatalogueWrites } from './catalogCache.js';

const productTypeSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    slug: { type: String, required: true }, // used by the frontend, e.g. "split", "front_load"
    name: { type: String, required: true },
    icon: String,
    desc: String,
    // What this type's variants vary by, e.g. { key: 'capacity', label: 'Capacity' }
    // for Split AC or { key: 'screen_size', label: 'Screen Size' } for LED TV.
    // Null when the type has no variants (Window AC). The values themselves are
    // Variant rows — pricing lives on ServiceOffering/OfferingRate, never here.
    variantDimension: { type: dimensionSchema, default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productTypeSchema.index({ category: 1, slug: 1 }, { unique: true });

applyStandardPlugins(productTypeSchema);
// Writes drop the cached customer category trees (catalogCache.js).
productTypeSchema.plugin(watchCatalogueWrites);

export const ProductType = mongoose.models.ProductType || mongoose.model('ProductType', productTypeSchema);
