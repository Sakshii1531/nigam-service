import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { watchCatalogueWrites } from './catalogCache.js';

// The only bookable thing in the catalogue: one exact (product type?, variant?,
// service) combination with its own code, quantity rules, express/tax settings
// and customer-facing content. Its commercial numbers (customer price, partner
// payout, express fee/incentive) are NOT stored here — they live in versioned
// OfferingRate rows so every change is audited and bookings can snapshot the
// exact version they were priced at. See docs/master-catalogue/ARCHITECTURE.md §2.5.

export const BOOKING_TYPES = Object.freeze(['PRODUCT_LINKED', 'STANDALONE']);
export const PRICING_UNITS = Object.freeze(['PER_SERVICE', 'PER_UNIT', 'PER_PIECE', 'PER_CAPACITY', 'CUSTOM']);
export const REQUIRED_INFO_TYPES = Object.freeze(['text', 'number', 'select', 'photo']);
export const OFFERING_CODE_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

const requiredInfoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: REQUIRED_INFO_TYPES, default: 'text' },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
  },
  { _id: false },
);

const serviceOfferingSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [OFFERING_CODE_PATTERN, 'Offering code must be uppercase letters/digits separated by hyphens'],
    },
    name: { type: String, required: true, trim: true },
    bookingType: { type: String, enum: BOOKING_TYPES, required: true },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', default: null },
    // Null = variant-agnostic: applies to every variant of the product type (or
    // every option of the service). A variant-specific offering for the same
    // service wins over it when both exist.
    variant: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', default: null },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogService', required: true },

    pricingUnit: { type: String, enum: PRICING_UNITS, default: 'PER_UNIT' },
    unitLabel: { type: String, default: 'per unit', trim: true },
    minQty: { type: Number, default: 1, min: 1 },
    maxQty: { type: Number, default: 1, min: 1 },

    express: {
      enabled: { type: Boolean, default: false },
    },
    tax: {
      // Null = use PlatformSettings.defaultGstPercent.
      gstPercent: { type: Number, default: null, min: 0, max: 100 },
      sacCode: { type: String, default: '' },
    },

    estimatedDurationMins: { type: Number, default: null, min: 0 },
    description: { type: String, default: '' },
    included: { type: [String], default: [] },
    excluded: { type: [String], default: [] },
    customerInstructions: { type: String, default: '' },
    requiredInfo: { type: [requiredInfoSchema], default: [] },

    // Admin-only. Never serialised to customer or partner responses.
    internalNotes: { type: String, default: '' },
    // True while the active rate is a seeded DEMO placeholder; cleared when an
    // admin saves a real rate version (rateWriter.createRateVersion).
    needsRateReview: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    serviceability: {
      mode: { type: String, enum: ['ALL', 'CITIES'], default: 'ALL' },
      cities: { type: [String], default: [] },
    },
    // When the offering itself can be booked (seasonal / launch windows) — the
    // client's "Effective From / Until". Price effective dates are on OfferingRate.
    availableFrom: { type: Date, default: null },
    availableUntil: { type: Date, default: null },

    keywords: { type: [String], default: [] },
    searchText: { type: String, default: '' },
  },
  { timestamps: true },
);

// One offering per combination — two "Split AC 1.5 Ton Installation" rows
// would make the price a coin toss. Nulls index as values, so a standalone
// service without options is also unique.
serviceOfferingSchema.index({ service: 1, productType: 1, variant: 1 }, { unique: true });
serviceOfferingSchema.index({ category: 1, isActive: 1, displayOrder: 1 });
serviceOfferingSchema.index({ searchText: 'text' });

serviceOfferingSchema.pre('validate', async function checkConsistency() {
  if (this.pricingUnit === 'PER_SERVICE') {
    this.minQty = 1;
    this.maxQty = 1;
  }
  if (this.minQty > this.maxQty) {
    this.invalidate('maxQty', 'Maximum quantity cannot be less than minimum quantity');
  }
  if (this.availableFrom && this.availableUntil && this.availableFrom >= this.availableUntil) {
    this.invalidate('availableUntil', 'Available-until must be after available-from');
  }

  if (this.bookingType === 'STANDALONE' && this.productType) {
    this.invalidate('productType', 'A standalone offering cannot have a product type');
  }
  if (this.bookingType === 'PRODUCT_LINKED' && !this.productType) {
    this.invalidate('productType', 'A product-linked offering needs a product type');
  }

  // Parent-consistency checks only when the relevant refs changed, so a
  // plain content edit doesn't pay for three lookups.
  if (!this.isNew && !this.isModified('category service productType variant')) return;

  const CatalogService = mongoose.model('CatalogService');
  const ProductType = mongoose.model('ProductType');
  const Variant = mongoose.model('Variant');

  const [service, productType, variant] = await Promise.all([
    this.service ? CatalogService.findById(this.service).select('category') : null,
    this.productType ? ProductType.findById(this.productType).select('category') : null,
    this.variant ? Variant.findById(this.variant).select('productType service') : null,
  ]);

  if (!service) {
    this.invalidate('service', 'Service not found');
  } else if (String(service.category) !== String(this.category)) {
    this.invalidate('service', 'Service belongs to a different category');
  }
  if (this.productType) {
    if (!productType) this.invalidate('productType', 'Product type not found');
    else if (String(productType.category) !== String(this.category)) {
      this.invalidate('productType', 'Product type belongs to a different category');
    }
  }
  if (this.variant) {
    if (!variant) {
      this.invalidate('variant', 'Variant not found');
    } else if (this.bookingType === 'PRODUCT_LINKED' && String(variant.productType) !== String(this.productType)) {
      this.invalidate('variant', 'Variant does not belong to this product type');
    } else if (this.bookingType === 'STANDALONE' && String(variant.service) !== String(this.service)) {
      this.invalidate('variant', 'Option does not belong to this service');
    }
  }
});

serviceOfferingSchema.pre('save', async function guardCodeAndIndexSearch() {
  if (!this.isNew && this.isModified('code')) {
    throw new Error('Offering code cannot be changed after creation');
  }
  if (this.isNew || this.isModified('name code keywords category productType variant service')) {
    this.searchText = await buildSearchText(this);
  }
});

// Updates that bypass document middleware must not be a back door for
// changing the code. Setting it on insert (upsert) is fine.
function rejectCodeUpdate() {
  const update = this.getUpdate() || {};
  if ('code' in update || (update.$set && 'code' in update.$set)) {
    throw new Error('Offering code cannot be changed after creation');
  }
}
serviceOfferingSchema.pre('findOneAndUpdate', rejectCodeUpdate);
serviceOfferingSchema.pre('updateOne', rejectCodeUpdate);
serviceOfferingSchema.pre('updateMany', rejectCodeUpdate);

async function buildSearchText(offering) {
  const Category = mongoose.model('Category');
  const CatalogService = mongoose.model('CatalogService');
  const ProductType = mongoose.model('ProductType');
  const Variant = mongoose.model('Variant');

  const [category, service, productType, variant] = await Promise.all([
    Category.findById(offering.category).select('name keywords'),
    CatalogService.findById(offering.service).select('name keywords'),
    offering.productType ? ProductType.findById(offering.productType).select('name') : null,
    offering.variant ? Variant.findById(offering.variant).select('label') : null,
  ]);

  return [
    offering.code.replace(/-/g, ' '),
    offering.name,
    category?.name,
    ...(category?.keywords || []),
    productType?.name,
    variant?.label,
    service?.name,
    ...(service?.keywords || []),
    ...(offering.keywords || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

applyStandardPlugins(serviceOfferingSchema);
// Writes drop the cached customer category trees (catalogCache.js).
serviceOfferingSchema.plugin(watchCatalogueWrites);

export const ServiceOffering =
  mongoose.models.ServiceOffering || mongoose.model('ServiceOffering', serviceOfferingSchema);
