import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Merchandising tiles on the customer app's home screen.
//
// The console previously kept five separate localStorage lists — dashboard
// services, most-booked, appliance services, category chips and brand cards —
// but they are the same thing in different slots: a curated tile with artwork
// that links somewhere. One model with a `placement` discriminator keeps them
// in one CRUD surface instead of five near-identical ones; fields not relevant
// to a placement are simply left unset (a category chip has no price).
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
    rating: Number,
    price: Number,
    badge: String,
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

export const HomeTile = mongoose.models.HomeTile || mongoose.model('HomeTile', homeTileSchema);
