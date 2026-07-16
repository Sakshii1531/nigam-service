import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Bottom of the brand catalog hierarchy: Brand -> SubBrand -> BrandProduct -> mapped MasterServices.
const brandProductSchema = new mongoose.Schema(
  {
    subBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'SubBrand', required: true, index: true },
    name: { type: String, required: true },
    model: String,
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterService' }],
  },
  { timestamps: true },
);

applyStandardPlugins(brandProductSchema);

export const BrandProduct = mongoose.models.BrandProduct || mongoose.model('BrandProduct', brandProductSchema);
