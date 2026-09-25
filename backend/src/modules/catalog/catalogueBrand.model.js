import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { watchCatalogueWrites } from './catalogCache.js';

// A catalogue brand (docs/master-catalogue Phase 19): a manufacturer the
// customer picks when booking a product-linked service ("which brand is your
// AC?"), so the Service Partner knows whose product they are servicing. It is
// NOT a partner brand — those are brand-admin tenants (super-admin/brand.model.js)
// with their own logins. Standalone services never ask for a brand.
const catalogueBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Lower-cased name, so "LG" and "lg" cannot both exist.
    nameKey: { type: String, required: true, unique: true },
    // Catalogue Category keys this brand is offered under, e.g. ["AC", "TV"].
    categories: { type: [String], default: [], index: true },
    // Manufacturer warranty a new appliance of this brand carries — what the
    // warranty detector measures a purchase date against.
    warrantyMonths: { type: Number, default: 12, min: 0, max: 120 },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

catalogueBrandSchema.pre('validate', function setNameKey() {
  if (this.name) this.nameKey = this.name.trim().toLowerCase();
});

applyStandardPlugins(catalogueBrandSchema);
// Brands appear in the cached customer category tree (catalogCache.js).
catalogueBrandSchema.plugin(watchCatalogueWrites);

export const CatalogueBrand = mongoose.models.CatalogueBrand || mongoose.model('CatalogueBrand', catalogueBrandSchema);

