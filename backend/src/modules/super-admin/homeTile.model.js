import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { watchCatalogueWrites } from '../catalog/catalogCache.js';

// Merchandising tiles on the customer app's home screen.
//
// The console previously kept five separate localStorage lists — dashboard
// services, most-booked, appliance services, category chips and brand cards —
// but they are the same thing in different slots: a curated tile with artwork
// that links somewhere. One model with a `placement` discriminator keeps them
// in one CRUD surface instead of five near-identical ones; fields not relevant
// to a placement are simply left unset (no tile has a price: the app shows the Master Catalogue's).
export const SERVICE_TILE_PLACEMENTS = Object.freeze(['most-booked', 'appliance-service']);
const homeTileSchema = new mongoose.Schema(
  {
    placement: {
      type: String,
      enum: ['category', 'dashboard-service', 'most-booked', 'appliance-service', 'brand-card'],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    imageUrl: String,
    // Lucide icon key, used by the category chips rather than artwork.
    icon: String,
    // most-booked / appliance-service: the catalogue service group the tile
    // books (docs/master-catalogue Phase 22). Price, "Instant" and rating are
    // read live from the catalogue, express settings and real reviews — never
    // stored on the tile. (It used to carry a typed-in rating and badge.)
    target: {
      type: new mongoose.Schema(
        {
          productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', default: null },
          service: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogService', required: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
    // Where tapping the tile goes — an in-app route, or a service name the
    // booking flow resolves.
    link: String,
    service: String,
    // Brand-card placement only: a full-width promo card carries a brand name,
    // supporting copy, a CTA label and its own colourway.
    brandName: String,
    subtitle: String,
    buttonText: String,
    badgeText: String,
    gradient: String,
    textColor: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

homeTileSchema.index({ placement: 1, sortOrder: 1 });

applyStandardPlugins(homeTileSchema);
// The home sections are cached with the catalogue (homeSections.service.js).
homeTileSchema.plugin(watchCatalogueWrites);

export const HomeTile = mongoose.models.HomeTile || mongoose.model('HomeTile', homeTileSchema);
