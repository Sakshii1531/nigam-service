import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// A product sold in the Buy New store (NCC Products). Detailed like a
// marketplace listing (docs/master-catalogue Phase 20): gallery, highlights,
// description, grouped specifications, what's in the box, manufacturer
// details and the per-product services (returns, pay on delivery,
// installation) the customer page shows.

const specItemSchema = new mongoose.Schema(
  { label: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false },
);
const specGroupSchema = new mongoose.Schema(
  { group: { type: String, required: true }, items: { type: [specItemSchema], default: [] } },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, index: true }, // a store category name (ProductCategory)
    name: { type: String, required: true },
    brand: String,
    modelNumber: String,
    colour: String,
    condition: { type: String, enum: ['New', 'Refurbished'], default: 'New', index: true },
    conditionGrade: String,
    originalPrice: Number, // MRP
    price: { type: Number, required: true }, // selling price
    rating: { type: Number, default: 0 },
    // Short bullet highlights ("1.5 Ton", "5 Star", "Inverter compressor").
    specs: [String],
    description: { type: String, default: '' },
    specifications: { type: [specGroupSchema], default: [] },
    inTheBox: { type: [String], default: [] },
    warrantyMonths: Number,
    warrantySummary: { type: String, default: '' }, // e.g. "1 year on product, 10 years on compressor"
    benefits: [String],
    returnDays: { type: Number, default: 7 }, // 0 = not returnable
    codAvailable: { type: Boolean, default: true },
    installationIncluded: { type: Boolean, default: false },
    manufacturer: { type: String, default: '' },
    countryOfOrigin: { type: String, default: '' },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    sku: { type: String, unique: true, sparse: true },
    imageUrl: String, // main image — always images[0] when a gallery exists
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Unchanged on purpose: a different text index cannot be created next to the
// existing one, so changing it stops the server starting on a live database.
// The admin search (product.service.js) matches model numbers itself.
productSchema.index({ name: 'text', brand: 'text' });

// The gallery's first picture is the main image, so the listing card and the
// detail page never disagree.
productSchema.pre('validate', function syncMainImage() {
  if (this.images?.length) this.imageUrl = this.images[0];
});

productSchema.virtual('discountPercent').get(function discountPercent() {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});
productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.stock <= 0) return 'Out of Stock';
  if (this.stock <= (this.lowStockThreshold ?? 5)) return 'Low Stock';
  return 'In Stock';
});

applyStandardPlugins(productSchema);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
