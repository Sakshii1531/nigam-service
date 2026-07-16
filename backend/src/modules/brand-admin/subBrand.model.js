import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// e.g. Havells (Brand) -> "Havells Lighting" / "Havells Appliances" (SubBrand).
const subBrandSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true },
    category: String,
  },
  { timestamps: true },
);

applyStandardPlugins(subBrandSchema);

export const SubBrand = mongoose.models.SubBrand || mongoose.model('SubBrand', subBrandSchema);
