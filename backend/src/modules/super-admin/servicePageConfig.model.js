import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// How one service's page looks in the customer app: the hero copy plus the
// priced catalog beneath it.
//
// The console previously kept these as three separate localStorage maps
// (service detail configs, service catalogs, booking catalog), all keyed by the
// same service name. They are one document per service — splitting them meant a
// service could have copy but no catalog, or drift between the two.
const catalogItemSchema = new mongoose.Schema(
  {
    _id: false,
    name: { type: String, required: true },
    rating: Number,
    reviews: Number,
    // Kept as the display string the app renders ("₹149"); the booking flow
    // prices server-side from the catalog, so this is presentation only.
    price: String,
    time: String,
    bullets: [String],
  },
  { _id: false },
);

const catalogSectionSchema = new mongoose.Schema(
  {
    _id: false,
    section: { type: String, required: true },
    items: [catalogItemSchema],
  },
  { _id: false },
);

const servicePageConfigSchema = new mongoose.Schema(
  {
    // The service name as the app knows it, e.g. 'AC Repair'.
    serviceKey: { type: String, required: true, unique: true, index: true },
    tagline: String,
    subtitle: String,
    bannerImg: String,
    productTypes: [String],
    // Comma-separated chip labels, matching what the console's textarea edits.
    subServices: String,
    catalog: [catalogSectionSchema],
  },
  { timestamps: true },
);

applyStandardPlugins(servicePageConfigSchema);

export const ServicePageConfig =
  mongoose.models.ServicePageConfig || mongoose.model('ServicePageConfig', servicePageConfigSchema);
