import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

// Platform-wide spare-part pricing catalog (cost + markup model), distinct from a
// given service provider's own ServiceProviderInventoryItem stock. Detailed
// in docs/master-catalogue Phase 21: pictures, description, what it fits,
// specifications, warranty, storage bin and a stock-movement history
// (SparePartStockMovement).

export const PART_UNITS = Object.freeze(['piece', 'set', 'pair', 'metre', 'litre', 'kg', 'roll']);

const sparePartCatalogSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: String,
    code: String, // manufacturer part number
    // Main appliance (a Master Catalogue category key) — what a partner's job
    // on that appliance lists this part under.
    category: String,
    // Other appliances / brands / models the part also fits.
    compatibleCategories: { type: [String], default: [] },
    compatibleBrands: { type: [String], default: [] },
    compatibleModels: { type: [String], default: [] },
    description: { type: String, default: '' },
    images: { type: [String], default: [] },
    specifications: {
      type: [new mongoose.Schema({ label: { type: String, required: true }, value: { type: String, required: true } }, { _id: false })],
      default: [],
    },
    unit: { type: String, enum: PART_UNITS, default: 'piece' },
    warrantyMonths: { type: Number, default: 0 },
    costPrice: { type: Number, required: true },
    markupPercent: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    hsnCode: String,
    stock: { type: Number, default: 0 },
    // Re-order controls. The console rendered a fixed "Authorized Distributor:
    // Nigam Spares Ltd / 2-3 business days" block for every part; these are the
    // fields that make that panel say something true, per part.
    reorderThreshold: { type: Number, default: 5 },
    supplier: String,
    leadTimeDays: Number,
    storageLocation: { type: String, default: '' }, // warehouse bin / rack, e.g. "Rack B-3"
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// retailPrice = costPrice + costPrice * markupPercent / 100, derived rather than
// stored so editing costPrice/markupPercent can't leave a stale retailPrice behind.
sparePartCatalogSchema.virtual('retailPrice').get(function retailPrice() {
  return this.costPrice + (this.costPrice * this.markupPercent) / 100;
});
sparePartCatalogSchema.virtual('marginPerUnit').get(function marginPerUnit() {
  return (this.costPrice * this.markupPercent) / 100;
});
sparePartCatalogSchema.virtual('stockValue').get(function stockValue() {
  return this.costPrice * Math.max(0, this.stock);
});
sparePartCatalogSchema.virtual('imageUrl').get(function imageUrl() {
  return this.images?.[0] || null;
});
sparePartCatalogSchema.virtual('status').get(function status() {
  if (this.stock <= 0) return 'Out of Stock';
  if (this.stock <= (this.reorderThreshold ?? 5)) return 'Low Stock';
  return 'In Stock';
});

applyStandardPlugins(sparePartCatalogSchema, { prefix: ID_PREFIXES.SKU });

export const SparePartCatalog = mongoose.models.SparePartCatalog || mongoose.model('SparePartCatalog', sparePartCatalogSchema);
