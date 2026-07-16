import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const productTypeSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    slug: { type: String, required: true }, // used by the frontend, e.g. "split", "front_load"
    name: { type: String, required: true },
    icon: String,
    desc: String,
  },
  { timestamps: true },
);

productTypeSchema.index({ category: 1, slug: 1 }, { unique: true });

applyStandardPlugins(productTypeSchema);

export const ProductType = mongoose.models.ProductType || mongoose.model('ProductType', productTypeSchema);
