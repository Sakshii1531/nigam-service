import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';

// Bottom of the brand catalog hierarchy: Brand -> SubBrand -> BrandProduct -> mapped MasterServices.
const brandProductSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    subBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'SubBrand', required: true, index: true },
    name: { type: String, required: true },
    model: String,
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterService' }],
  },
  { timestamps: true },
);

brandScopeGuard(brandProductSchema);
applyStandardPlugins(brandProductSchema);

export const BrandProduct = mongoose.models.BrandProduct || mongoose.model('BrandProduct', brandProductSchema);
