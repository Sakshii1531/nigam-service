import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { watchCatalogueWrites } from './catalogCache.js';

// A service category: key, name, visuals, brands and booking-flow copy. The
// top of the Master Catalogue (docs/master-catalogue) — product types,
// services and priced offerings all hang off it.
const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "AC", "Washing Machine"
    name: { type: String, required: true },
    icon: String,
    // Picture of the appliance / service (Cloudinary URL), set in Master Catalogue.
    imageUrl: { type: String, default: null },
    color: String,
    lightBg: String,
    categoryNote: String,
    bannerImg: String,
    tagline: String,
    subtitle: String,
    brands: [String], // simple list of brand names offered under this category's booking flow
    whyBrandPoints: [String],
    isForYou: { type: Boolean, default: false },
    isMore: { type: Boolean, default: false },
    isFridge: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    // Which sidebar tab(s) on the customer app's Categories browse page this
    // shows under, e.g. ["handyman", "appliance"] — a category can appear
    // under more than one tab (an AC repair category belongs to both
    // "Handyman" and "Appliance"). `section` is the sub-heading grouping
    // categories within a given tab, e.g. "Maintenance", "Installation".
    groups: { type: [String], default: [], index: true },
    section: { type: String, default: '' },
    // Search synonyms for the master catalogue (e.g. "electrician", "wiring"
    // on Electrical) — folded into each offering's searchText.
    keywords: { type: [String], default: [] },
  },
  { timestamps: true },
);

applyStandardPlugins(categorySchema);
// Writes drop the cached customer category trees (catalogCache.js).
categorySchema.plugin(watchCatalogueWrites);

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
