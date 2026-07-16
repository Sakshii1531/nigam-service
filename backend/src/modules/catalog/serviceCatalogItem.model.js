import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const serviceCatalogItemSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    slug: { type: String, required: true }, // e.g. "installation", "gas_refilling"
    name: { type: String, required: true },
    icon: String,
    desc: String,
    price: { type: Number, required: true },
    unit: { type: String, default: 'per unit' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

serviceCatalogItemSchema.index({ category: 1, slug: 1 }, { unique: true });

applyStandardPlugins(serviceCatalogItemSchema);

export const ServiceCatalogItem =
  mongoose.models.ServiceCatalogItem || mongoose.model('ServiceCatalogItem', serviceCatalogItemSchema);
