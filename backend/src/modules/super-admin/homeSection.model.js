import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { watchCatalogueWrites } from '../catalog/catalogCache.js';

// The customer app's home screen is an ordered list of sections. Nine of them
// are built in (the ones the app has always had); an admin can reorder, hide
// and rename those, and can add more of two kinds:
//
//   brand-cards  a row of promo cards (like "Brands & Offers"), each its own tile
//   service-row  a curated row of bookable catalogue services (like "Appliance
//                repair & service"); price, Instant and rating stay live
//   banner-carousel  a sliding strip of banner pictures (like the main banners);
//                each banner may link somewhere. Owned through Banner.section.
//
// A custom section owns its tiles through HomeTile.section. The built-in
// sections keep reading their tiles by placement (section: null), exactly as
// before, so nothing already published moves.
export const BUILT_IN_SECTIONS = Object.freeze([
  { key: 'banners', kind: 'banners', title: 'Service banners', headingShown: false },
  { key: 'categories', kind: 'categories', title: 'Our Services', headingShown: true },
  { key: 'warranty-offers', kind: 'warranty-offers', title: 'Warranty offer banners (mobile)', headingShown: false },
  { key: 'brand-cards', kind: 'brand-cards', title: 'Brands & Offers', headingShown: true },
  { key: 'most-booked', kind: 'most-booked', title: 'Most Booked Services', headingShown: true },
  { key: 'appliance-services', kind: 'appliance-services', title: 'Appliance repair & service', headingShown: true },
  { key: 'spare-parts', kind: 'spare-parts', title: 'Spare Parts & Accessories', headingShown: true },
  { key: 'reviews', kind: 'reviews', title: 'Customer reviews', headingShown: false },
  { key: 'stories', kind: 'stories', title: 'Stories', headingShown: false },
]);

export const SECTION_KINDS = Object.freeze([...BUILT_IN_SECTIONS.map((s) => s.kind), 'service-row', 'banner-carousel']);
export const CUSTOM_SECTION_KINDS = Object.freeze(['brand-cards', 'service-row', 'banner-carousel']);

const homeSectionSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: SECTION_KINDS, required: true },
    // Built-in sections have a stable key (their kind); custom ones have none.
    key: { type: String, default: null },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    builtIn: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    // Where a custom service row's "See all" button goes (none = no button).
    seeAllLink: { type: String, default: '' },
  },
  { timestamps: true },
);

homeSectionSchema.index({ sortOrder: 1 });
homeSectionSchema.index({ key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } });

applyStandardPlugins(homeSectionSchema);
homeSectionSchema.plugin(watchCatalogueWrites);

export const HomeSection = mongoose.models.HomeSection || mongoose.model('HomeSection', homeSectionSchema);
