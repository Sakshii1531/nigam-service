import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    // The service provider app renders banners as titled cards with supporting copy;
    // the customer app uses artwork only, so both are optional.
    title: String,
    description: String,
    // 'non-warranty' / 'warranty' are the two sets of the main banner carousel;
    // 'warranty-offers' is the mobile strip under the categories.
    segment: { type: String, enum: ['warranty', 'non-warranty', 'warranty-offers'], default: 'non-warranty' },
    // A banner an admin added to a custom "banner carousel" home section belongs
    // to that section (and to no segment's carousel).
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeSection', default: null, index: true },
    // Optional: where tapping the banner goes (in-app path or https:// address).
    link: { type: String, default: '' },
    app: { type: String, enum: ['customer', 'service_provider'], default: 'customer', index: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(bannerSchema);

export const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
