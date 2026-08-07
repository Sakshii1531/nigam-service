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
    category: String,
    costPrice: { type: Number, required: true },
    markupPercent: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    // Re-order controls. The console rendered a fixed "Authorized Distributor:
    // Nigam Spares Ltd / 2-3 business days" block for every part; these are the
    // fields that make that panel say something true, per part.
    reorderThreshold: { type: Number, default: 5 },
    supplier: String,
    leadTimeDays: Number,
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
  if (this.stock <= (this.reorderThreshold ?? 5)) return 'Low Stock';
  return 'In Stock';
});

applyStandardPlugins(sparePartCatalogSchema, { prefix: ID_PREFIXES.SKU });

export const SparePartCatalog = mongoose.models.SparePartCatalog || mongoose.model('SparePartCatalog', sparePartCatalogSchema);
