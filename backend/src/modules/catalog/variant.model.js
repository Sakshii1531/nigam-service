import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// One size / capacity / configuration value: "1.5 Ton" under Split AC,
// "55–65 inch" under LED TV, or — for a standalone service — an option such as
// "501–1000 L" under Water Tank Cleaning. Exactly one parent is set.
const variantSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', default: null },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogService', default: null },
    slug: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

variantSchema.pre('validate', function exactlyOneParent() {
  if (Boolean(this.productType) === Boolean(this.service)) {
    this.invalidate('productType', 'A variant belongs to exactly one product type or one service');
  }
});

// Slugs are unique per parent. Partial indexes so the null side of each pair
// doesn't collide across every variant of the other kind.
variantSchema.index(
  { productType: 1, slug: 1 },
  { unique: true, partialFilterExpression: { productType: { $type: 'objectId' } } },
);
variantSchema.index(
  { service: 1, slug: 1 },
  { unique: true, partialFilterExpression: { service: { $type: 'objectId' } } },
);

applyStandardPlugins(variantSchema);

export const Variant = mongoose.models.Variant || mongoose.model('Variant', variantSchema);
