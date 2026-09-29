import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// The customer app's first Partner Warranty screen ("ElectroCare — Home
// Appliances & Electronics", "BathCare", …). A group bundles Master Catalogue
// categories; a brand shows under a group when it covers a product type in one
// of those categories.
const warrantyGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: String,
    imageUrl: { type: String, default: null },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(warrantyGroupSchema);

export const WarrantyGroup = mongoose.models.WarrantyGroup || mongoose.model('WarrantyGroup', warrantyGroupSchema);
