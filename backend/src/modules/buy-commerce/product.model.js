import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const productSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, index: true },
    name: { type: String, required: true },
    brand: String,
    condition: { type: String, enum: ['New', 'Refurbished'], default: 'New', index: true },
    conditionGrade: String,
    originalPrice: Number,
    price: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    specs: [String],
    fullSpecs: { type: Map, of: String, default: {} },
    warrantyMonths: Number,
    benefits: [String],
    stock: { type: Number, default: 0 },
    sku: { type: String, unique: true, sparse: true },
    imageUrl: String,
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', brand: 'text' });

applyStandardPlugins(productSchema);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
