import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const productTypeSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    slug: { type: String, required: true }, // used by the frontend, e.g. "split", "front_load"
    name: { type: String, required: true },
    icon: String,
    desc: String,
    // Flat surcharge added on top of whichever service's base price the
    // customer books, for this specific appliance type — e.g. Split AC costs
    // more to install than Window AC because of the outdoor unit, regardless
    // of which category service (install/repair/gas refill/...) is booked.
    priceAddon: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

productTypeSchema.index({ category: 1, slug: 1 }, { unique: true });

applyStandardPlugins(productTypeSchema);

export const ProductType = mongoose.models.ProductType || mongoose.model('ProductType', productTypeSchema);
