import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// An issue a customer can pick for a product ("Cooling Issue" for Split AC).
// Set per ProductType; a category-level issue (productType: null) is the
// fallback for product types that have none of their own.
const warrantyIssueSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', default: null, index: true },
    name: { type: String, required: true, trim: true },
    icon: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(warrantyIssueSchema);

export const WarrantyIssue = mongoose.models.WarrantyIssue || mongoose.model('WarrantyIssue', warrantyIssueSchema);
