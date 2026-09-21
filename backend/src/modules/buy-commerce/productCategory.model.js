import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

/**
 * ProductCategory — manages the appliance/product categories available
 * in the Buy New storefront (Television, Refrigerator, Air Conditioner, etc.).
 *
 * This decouples the storefront category list from the hardcoded arrays that
 * previously lived in the frontend, so super-admins can add, rename, reorder,
 * or deactivate categories without a code deployment.
 */
const productCategorySchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, unique: true, trim: true },
    slug:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon:      { type: String, default: '📦' },   // emoji or icon identifier
    sortOrder: { type: Number, default: 0, index: true },
    isActive:  { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(productCategorySchema);

export const ProductCategory =
  mongoose.models.ProductCategory ||
  mongoose.model('ProductCategory', productCategorySchema);

