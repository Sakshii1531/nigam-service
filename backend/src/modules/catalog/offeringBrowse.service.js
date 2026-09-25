import { Category } from './category.model.js';
import { ServiceOffering } from './serviceOffering.model.js';
import { Variant } from './variant.model.js';
import { resolveRates } from './rateResolver.js';
import { toCustomerOffering, toCustomerOfferingDetail } from './commercialView.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';
import { GST_PERCENT_DEFAULT } from '../../config/constants.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { catalogError, CATALOG_ERROR_CODES } from './catalogErrors.js';
import { cachedTree } from './catalogCache.js';
import { brandNamesForCategory } from './catalogueBrand.service.js';

// What a customer is allowed to see and pick. An offering is bookable only if
// it and every parent (category, product type, variant, service) is active,
// it is inside its availability window, it serves the customer's city, and
// it has an active rate. The customer tree is built upward from bookable
// offerings, so a product type / variant / service with nothing bookable
// under it simply never appears (client Req 17, Test 12).

const POPULATE = [
  { path: 'category', select: 'key name isActive' },
  { path: 'productType', select: 'slug name icon desc variantDimension isActive sortOrder' },
  { path: 'variant', select: 'slug label isActive sortOrder productType service' },
  { path: 'service', select: 'slug name icon desc optionDimension isActive sortOrder' },
];

const norm = (value) => String(value || '').trim().toLowerCase();

function isAvailable(offering, { at, city }) {
  if (offering.availableFrom && offering.availableFrom > at) return false;
  if (offering.availableUntil && offering.availableUntil <= at) return false;
  if (!offering.category?.isActive || !offering.service?.isActive) return false;
  if (offering.productType && offering.productType.isActive === false) return false;
  if (offering.variant && offering.variant.isActive === false) return false;
  if (offering.serviceability?.mode === 'CITIES') {
    return Boolean(city) && offering.serviceability.cities.some((c) => norm(c) === norm(city));
  }
  return true;
}

/** [{ offering, rate }] for every offering matching `filter` that is bookable right now. */
export async function loadBookableOfferings(filter, { at = new Date(), city = null, pincode = null } = {}) {
  const offerings = await ServiceOffering.find({ ...filter, isActive: true })
    .populate(POPULATE)
    .sort({ displayOrder: 1, name: 1 })
    .lean();
  const available = offerings.filter((offering) => isAvailable(offering, { at, city }));
  const rates = await resolveRates(available.map((o) => o._id), { at, city, pincode });
  return available.filter((o) => rates.has(String(o._id))).map((o) => ({ offering: o, rate: rates.get(String(o._id)) }));
}

export async function platformPricingSettings() {
  const settings = await PlatformSettings.findOne().lean();
  return {
    defaultGstPercent: settings?.defaultGstPercent ?? GST_PERCENT_DEFAULT,
    advancePercent: settings?.bookingAdvancePercent ?? 20,
    coinsPerRupee: settings?.coinConversionRate || 10,
  };
}

const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.label || a.name).localeCompare(String(b.label || b.name));

/**
 * Everything the booking flow needs for one category. Variants are listed
 * for a product type (or options for a standalone service) only when they
 * can lead to a bookable offering: either a variant-specific offering exists
 * for them, or a variant-agnostic one covers the whole parent.
 */
export async function getCategoryTree(key, loc = {}) {
  return cachedTree(key, loc, () => buildCategoryTree(key, loc));
}

async function buildCategoryTree(key, loc) {
  const category = await Category.findOne({ key, isActive: true }).lean();
  if (!category) throw new ApiError(404, `No category found for key "${key}"`);

  const [bookable, settings] = await Promise.all([
    loadBookableOfferings({ category: category._id }, loc),
    platformPricingSettings(),
  ]);

  const parentVariants = await Variant.find({
    category: category._id,
    isActive: true,
  }).lean();

  const productTypes = new Map();
  const standaloneServices = new Map();
  const services = new Map();

  for (const { offering } of bookable) {
    const svc = offering.service;
    services.set(String(svc._id), svc);

    const isProduct = offering.bookingType === 'PRODUCT_LINKED';
    const parent = isProduct ? offering.productType : svc;
    const bucket = isProduct ? productTypes : standaloneServices;
    const parentKey = String(parent._id);
    if (!bucket.has(parentKey)) bucket.set(parentKey, { doc: parent, variantIds: new Set(), agnostic: false });
    const entry = bucket.get(parentKey);
    if (offering.variant) entry.variantIds.add(String(offering.variant._id));
    else entry.agnostic = true;
  }

  // Only a product-linked booking asks "which brand is it?" — a category with
  // nothing but standalone services has no brand picker at all.
  const brands = productTypes.size > 0 ? await brandNamesForCategory(category.key) : [];

  const variantsFor = (parentField, parentId, entry) =>
    parentVariants
      .filter((v) => String(v[parentField]) === parentId && (entry.agnostic || entry.variantIds.has(String(v._id))))
      .sort(bySort)
      .map((v) => ({ id: String(v._id), slug: v.slug, label: v.label }));

  return {
    category: {
      key: category.key,
      name: category.name,
      icon: category.icon,
      color: category.color,
      lightBg: category.lightBg,
      categoryNote: category.categoryNote,
      brands,
      whyBrandPoints: category.whyBrandPoints || [],
    },
    productTypes: [...productTypes.entries()]
      .map(([id, { doc, ...entry }]) => ({
        id,
        slug: doc.slug,
        name: doc.name,
        icon: doc.icon,
        desc: doc.desc,
        sortOrder: doc.sortOrder,
        variantDimension: doc.variantDimension || null,
        variants: variantsFor('productType', id, entry),
      }))
      .sort(bySort)
      .map(({ sortOrder: _sortOrder, ...rest }) => rest),
    standaloneServices: [...standaloneServices.entries()]
      .map(([id, { doc, ...entry }]) => ({
        id,
        slug: doc.slug,
        name: doc.name,
        icon: doc.icon,
        desc: doc.desc,
        sortOrder: doc.sortOrder,
        optionDimension: doc.optionDimension || null,
        options: variantsFor('service', id, entry),
      }))
      .sort(bySort)
      .map(({ sortOrder: _sortOrder, ...rest }) => rest),
    services: [...services.values()]
      .sort(bySort)
      .map((s) => ({ id: String(s._id), slug: s.slug, name: s.name, icon: s.icon, desc: s.desc })),
    offerings: bookable.map(({ offering, rate }) => toCustomerOffering(offering, rate, settings.defaultGstPercent)),
  };
}

export async function getOfferingDetail(code, loc = {}) {
  const [match] = await loadBookableOfferings({ code: String(code).toUpperCase() }, loc);
  if (!match) {
    throw catalogError(CATALOG_ERROR_CODES.OFFERING_NOT_BOOKABLE, 'This service is not available right now.', 404);
  }
  const settings = await platformPricingSettings();
  return toCustomerOfferingDetail(match.offering, match.rate, settings.defaultGstPercent);
}
