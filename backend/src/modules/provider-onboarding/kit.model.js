import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
const schema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: String,
  contents: [String],
  imageUrl: String,
  price: { type: Number, required: true, min: 0 },
  shippingCharge: { type: Number, default: 0, min: 0 },
  stockRevision: { type: Number, default: 0 },
  stock: { type: Number, default: 0, min: 0 },
  qualifiesForOnboarding: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, optimisticConcurrency: true });
applyStandardPlugins(schema);
export const ProviderKit = mongoose.models.ProviderKit || mongoose.model('ProviderKit', schema);
