import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

// Platform-wide spare-part pricing catalog (cost + markup model), distinct from a
// given technician's own TechInventoryItem stock.
const sparePartCatalogSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: String,
    code: String,
    costPrice: { type: Number, required: true },
    markupPercent: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// retailPrice = costPrice + costPrice * markupPercent / 100, derived rather than
// stored so editing costPrice/markupPercent can't leave a stale retailPrice behind.
sparePartCatalogSchema.virtual('retailPrice').get(function retailPrice() {
  return this.costPrice + (this.costPrice * this.markupPercent) / 100;
});
sparePartCatalogSchema.virtual('status').get(function status() {
  if (this.stock <= 0) return 'Out of Stock';
  if (this.stock <= 5) return 'Low Stock';
  return 'In Stock';
});

applyStandardPlugins(sparePartCatalogSchema, { prefix: ID_PREFIXES.SKU });

export const SparePartCatalog = mongoose.models.SparePartCatalog || mongoose.model('SparePartCatalog', sparePartCatalogSchema);
