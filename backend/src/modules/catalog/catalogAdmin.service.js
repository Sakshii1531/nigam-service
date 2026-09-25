import { Category } from './category.model.js';
import { ProductType } from './productType.model.js';
import { Variant } from './variant.model.js';
import { CatalogService } from './catalogService.model.js';
import { ServiceOffering } from './serviceOffering.model.js';
import { OfferingRate, RATE_MONEY_FIELDS } from './offeringRate.model.js';
import { createRateVersion, findLatestRate, endRateScope } from './rateWriter.js';
import { resolveRates } from './rateResolver.js';
import { priceLine } from './offeringPricing.js';
import { platformPricingSettings } from './offeringBrowse.service.js';
import { suggestOfferingCode } from './offeringCode.js';
import { toPaise, toRupees } from './money.js';
import { logAudit } from '../shared/auditLog.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Super-admin Master Catalogue (docs/master-catalogue Phase 3). Unlike the
// customer reads, this sees everything — inactive rows, partner payouts,
// margins, internal notes. Amounts cross the API boundary in rupees and are
// stored in paise. Every commercial change goes through rateWriter so it is
// versioned and audited; offering identity (code + the combination it
// prices) is fixed after creation — a different combination is a new
// offering (duplicate it).

const slugify = (text) => String(text || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const idOf = (doc) => (doc ? String(doc._id ?? doc) : null);

/** A unique-index clash (duplicate slug, code or combination) is a 409 the admin can act on, not a 500. */
async function saveUnique(work, conflictMessage) {
  try {
    return await work();
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, conflictMessage);
    throw err;
  }
}

async function assertCombinationFree({ service, productType = null, variant = null }) {
  const existing = await ServiceOffering.findOne({ service, productType: productType || null, variant: variant || null }).select('code');
  if (existing) throw new ApiError(409, `This combination already exists as ${existing.code}`);
}

async function findOr404(Model, id, label) {
  const doc = await Model.findById(id);
  if (!doc) throw new ApiError(404, `${label} not found`);
  return doc;
}

function rupeeRate(rate) {
  if (!rate) return null;
  return {
    id: String(rate._id),
    version: rate.version,
    scope: rate.scope,
    customerPrice: toRupees(rate.customerPrice),
    spPayout: toRupees(rate.spPayout),
    expressFee: toRupees(rate.expressFee),
    expressSpIncentive: toRupees(rate.expressSpIncentive),
    effectiveFrom: rate.effectiveFrom,
    effectiveUntil: rate.effectiveUntil,
  };
}

// ─── Categories & structure ──────────────────────────────────────────────

export async function listCategories() {
  const [categories, offeringCounts] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean(),
    ServiceOffering.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          needsRateReview: { $sum: { $cond: ['$needsRateReview', 1, 0] } },
        },
      },
    ]),
  ]);
  const counts = new Map(offeringCounts.map((c) => [String(c._id), c]));
  return categories.map((c) => {
    const count = counts.get(String(c._id)) || { total: 0, active: 0, needsRateReview: 0 };
    return {
      id: String(c._id),
      key: c.key,
      name: c.name,
      icon: c.icon,
      isActive: c.isActive,
      keywords: c.keywords || [],
      groups: c.groups || [],
      section: c.section || '',
      offerings: { total: count.total, active: count.active, needsRateReview: count.needsRateReview },
    };
  });
}

export async function createCategory(data, actorId) {
  if (await Category.exists({ key: data.key })) throw new ApiError(409, `Category "${data.key}" already exists`);
  const category = await Category.create(data);
  await logAudit({ user: actorId, action: `Catalogue: created category ${category.key}`, type: 'System' });
  return category.toJSON();
}

export async function updateCategory(id, data, actorId) {
  const category = await findOr404(Category, id, 'Category');
  category.set(data);
  await category.save();
  await logAudit({ user: actorId, action: `Catalogue: updated category ${category.key}`, type: 'System' });
  return category.toJSON();
}

/** Everything under one category, inactive included — the admin tree pane. */
export async function getCategoryStructure(id) {
  const category = await findOr404(Category, id, 'Category');
  const [productTypes, services, variants] = await Promise.all([
    ProductType.find({ category: category._id }).sort({ sortOrder: 1, name: 1 }).lean(),
    CatalogService.find({ category: category._id }).sort({ sortOrder: 1, name: 1 }).lean(),
    Variant.find({ category: category._id }).sort({ sortOrder: 1, label: 1 }).lean(),
  ]);
  const variantView = (v) => ({ id: String(v._id), slug: v.slug, label: v.label, sortOrder: v.sortOrder, isActive: v.isActive });
  return {
    category: category.toJSON(),
    productTypes: productTypes.map((pt) => ({
      id: String(pt._id),
      slug: pt.slug,
      name: pt.name,
      icon: pt.icon,
      desc: pt.desc,
      variantDimension: pt.variantDimension || null,
      sortOrder: pt.sortOrder,
      isActive: pt.isActive !== false,
      variants: variants.filter((v) => idOf(v.productType) === String(pt._id)).map(variantView),
    })),
    services: services.map((s) => ({
      id: String(s._id),
      slug: s.slug,
      name: s.name,
      icon: s.icon,
      desc: s.desc,
      keywords: s.keywords || [],
      optionDimension: s.optionDimension || null,
      sortOrder: s.sortOrder,
      isActive: s.isActive !== false,
      options: variants.filter((v) => idOf(v.service) === String(s._id)).map(variantView),
    })),
  };
}

// ─── Product types, services, variants ───────────────────────────────────

export async function createProductType(data, actorId) {
  await findOr404(Category, data.category, 'Category');
  const productType = await saveUnique(
    () => ProductType.create({ ...data, slug: data.slug || slugify(data.name) }),
    'A product type with this name/slug already exists in the category',
  );
  await logAudit({ user: actorId, action: `Catalogue: created product type ${productType.name}`, type: 'System' });
  return productType.toJSON();
}

export async function updateProductType(id, data, actorId) {
  const productType = await findOr404(ProductType, id, 'Product type');
  productType.set(data);
  await productType.save();
  await logAudit({ user: actorId, action: `Catalogue: updated product type ${productType.name}`, type: 'System' });
  return productType.toJSON();
}

export async function createService(data, actorId) {
  await findOr404(Category, data.category, 'Category');
  const service = await saveUnique(
    () => CatalogService.create({ ...data, slug: data.slug || slugify(data.name) }),
    'A service with this name/slug already exists in the category',
  );
  await logAudit({ user: actorId, action: `Catalogue: created service ${service.name}`, type: 'System' });
  return service.toJSON();
}

export async function updateService(id, data, actorId) {
  const service = await findOr404(CatalogService, id, 'Service');
  service.set(data);
  await service.save();
  await logAudit({ user: actorId, action: `Catalogue: updated service ${service.name}`, type: 'System' });
  return service.toJSON();
}

export async function createVariant(data, actorId) {
  const parent = data.productType
    ? await findOr404(ProductType, data.productType, 'Product type')
    : await findOr404(CatalogService, data.service, 'Service');
  const variant = await saveUnique(
    () => Variant.create({
      category: parent.category,
      productType: data.productType || null,
      service: data.service || null,
      slug: data.slug || slugify(data.label),
      label: data.label,
      sortOrder: data.sortOrder ?? 0,
    }),
    'This size/option already exists',
  );
  await logAudit({ user: actorId, action: `Catalogue: added variant ${variant.label}`, type: 'System' });
  return variant.toJSON();
}

export async function updateVariant(id, data, actorId) {
  const variant = await findOr404(Variant, id, 'Variant');
  variant.set(data);
  await variant.save();
  await logAudit({ user: actorId, action: `Catalogue: updated variant ${variant.label}`, type: 'System' });
  return variant.toJSON();
}

// ─── Offerings ───────────────────────────────────────────────────────────

const OFFERING_POPULATE = [
  { path: 'category', select: 'key name' },
  { path: 'productType', select: 'name variantDimension' },
  { path: 'variant', select: 'label' },
  { path: 'service', select: 'name' },
];

/** The admin table row: offering + current rate + what the customer pays + NCC margin, for qty 1. */
function offeringRow(offering, rate, nextRate, defaultGstPercent) {
  let finalPrice = null;
  let marginPercent = null;
  if (rate) {
    const line = priceLine({
      offering: { ...offering, minQty: 1, maxQty: Math.max(1, offering.maxQty) },
      rate,
      quantity: 1,
      defaultGstPercent,
    });
    finalPrice = toRupees(line.finalAmount);
    marginPercent = line.taxableAmount ? Math.round((line.nccMargin / line.taxableAmount) * 1000) / 10 : null;
  }
  return {
    id: String(offering._id),
    code: offering.code,
    name: offering.name,
    bookingType: offering.bookingType,
    category: offering.category ? { id: idOf(offering.category), key: offering.category.key, name: offering.category.name } : null,
    productType: offering.productType
      ? { id: idOf(offering.productType), name: offering.productType.name, hasVariants: Boolean(offering.productType.variantDimension) }
      : null,
    variant: offering.variant ? { id: idOf(offering.variant), label: offering.variant.label } : null,
    service: offering.service ? { id: idOf(offering.service), name: offering.service.name } : null,
    pricingUnit: offering.pricingUnit,
    unitLabel: offering.unitLabel,
    minQty: offering.minQty,
    maxQty: offering.maxQty,
    express: { enabled: Boolean(offering.express?.enabled) },
    gstPercent: offering.tax?.gstPercent ?? defaultGstPercent,
    gstOverride: offering.tax?.gstPercent ?? null,
    rate: rupeeRate(rate),
    nextRate: rupeeRate(nextRate),
    finalPrice,
    marginPercent,
    isActive: offering.isActive,
    needsRateReview: offering.needsRateReview,
    displayOrder: offering.displayOrder,
  };
}

async function upcomingRates(offeringIds, at) {
  const rates = await OfferingRate.find({ offering: { $in: offeringIds }, 'scope.type': 'DEFAULT', effectiveFrom: { $gt: at } })
    .sort({ effectiveFrom: 1 })
    .lean();
  const next = new Map();
  for (const rate of rates) if (!next.has(String(rate.offering))) next.set(String(rate.offering), rate);
  return next;
}

export async function listOfferings({ category, bookingType, active, needsRateReview, q, page, limit } = {}) {
  const filter = {};
  if (category) filter.category = category;
  if (bookingType) filter.bookingType = bookingType;
  if (active !== undefined) filter.isActive = active;
  if (needsRateReview !== undefined) filter.needsRateReview = needsRateReview;
  if (q) {
    const pattern = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ code: pattern }, { name: pattern }, { searchText: pattern }];
  }

  const { skip, limit: lim, page: pg } = parsePagination({ page, limit });
  const [offerings, total, settings] = await Promise.all([
    ServiceOffering.find(filter).populate(OFFERING_POPULATE).sort({ displayOrder: 1, name: 1 }).skip(skip).limit(lim).lean(),
    ServiceOffering.countDocuments(filter),
    platformPricingSettings(),
  ]);
  const at = new Date();
  const ids = offerings.map((o) => o._id);
  // Admin view is the DEFAULT price list, so no location is passed.
  const [current, next, local] = await Promise.all([resolveRates(ids, { at }), upcomingRates(ids, at), localRatesFor(ids, at)]);

  return {
    items: offerings.map((o) => ({
      ...offeringRow(o, current.get(String(o._id)), next.get(String(o._id)), settings.defaultGstPercent),
      localRateCount: (local.get(String(o._id)) || []).length,
    })),
    meta: paginationMeta({ page: pg, limit: lim, total }),
  };
}

export async function getOffering(id) {
  const offering = await ServiceOffering.findById(id).populate(OFFERING_POPULATE).lean();
  if (!offering) throw new ApiError(404, 'Offering not found');
  const at = new Date();
  const [current, next, settings, local] = await Promise.all([
    resolveRates([offering._id], { at }),
    upcomingRates([offering._id], at),
    platformPricingSettings(),
    localRatesFor([offering._id], at),
  ]);
  // eslint-disable-next-line no-unused-vars
  const { _id, __v, category, productType, variant, service, searchText, ...fields } = offering;
  return {
    ...fields,
    ...offeringRow(offering, current.get(String(_id)), next.get(String(_id)), settings.defaultGstPercent),
    tax: offering.tax,
    express: offering.express,
    localRates: local.get(String(_id)) || [],
  };
}

function initialRatePaise(rate) {
  return Object.fromEntries(RATE_MONEY_FIELDS.map((field) => [field, toPaise(rate[field] ?? 0)]));
}

export async function createOffering({ initialRate, ...data }, actorId) {
  const [category, productType, variant, service] = await Promise.all([
    findOr404(Category, data.category, 'Category'),
    data.productType ? findOr404(ProductType, data.productType, 'Product type') : null,
    data.variant ? findOr404(Variant, data.variant, 'Variant') : null,
    findOr404(CatalogService, data.service, 'Service'),
  ]);
  const code = data.code
    || (await suggestOfferingCode({ category: category.key, productType: productType?.name, variant: variant?.label, service: service.name }));

  const offering = new ServiceOffering({ ...data, code });
  await offering.validate(); // a wrong combination is a 400, before it can look like a duplicate
  await assertCombinationFree(data);
  await saveUnique(() => offering.save(), `Offering code ${code} is already taken`);
  try {
    await createRateVersion(offering._id, initialRatePaise(initialRate), {
      reason: initialRate.reason || 'Initial rate',
      changedBy: actorId,
      effectiveFrom: initialRate.effectiveFrom || new Date(),
    });
  } catch (err) {
    // An offering without a rate can never be priced — don't leave one behind.
    await ServiceOffering.deleteOne({ _id: offering._id });
    throw err;
  }
  await logAudit({ user: actorId, action: `Catalogue: created offering ${offering.code}`, type: 'Finance' });
  return getOffering(offering._id);
}

export async function updateOffering(id, data, actorId) {
  const offering = await findOr404(ServiceOffering, id, 'Offering');
  offering.set(data);
  await offering.save();
  await logAudit({ user: actorId, action: `Catalogue: updated offering ${offering.code}`, type: 'System' });
  return getOffering(offering._id);
}

export async function setOfferingStatus(id, isActive, actorId) {
  const offering = await findOr404(ServiceOffering, id, 'Offering');
  if (isActive && !(await findLatestRate(offering._id))) {
    throw new ApiError(400, 'Add a price before activating this offering');
  }
  offering.isActive = isActive;
  await offering.save();
  await logAudit({ user: actorId, action: `Catalogue: ${isActive ? 'activated' : 'deactivated'} offering ${offering.code}`, type: 'System' });
  return getOffering(offering._id);
}

/**
 * Starting point for a sibling offering — e.g. Split AC 2 Ton from 1.5 Ton.
 * Copies content and the current rate (flagged for review), starts inactive,
 * and must differ in variant or service so it is a different combination.
 */
export async function duplicateOffering(id, { variant = null, service, name, code }, actorId) {
  const source = await findOr404(ServiceOffering, id, 'Offering');
  const sourceRate = await findLatestRate(source._id);
  // eslint-disable-next-line no-unused-vars
  const { _id, createdAt, updatedAt, searchText, ...fields } = source.toObject();

  const [category, productType, variantDoc, serviceDoc] = await Promise.all([
    Category.findById(fields.category),
    fields.productType ? ProductType.findById(fields.productType) : null,
    variant ? findOr404(Variant, variant, 'Variant') : null,
    findOr404(CatalogService, service || fields.service, 'Service'),
  ]);
  const copy = new ServiceOffering({
    ...fields,
    variant: variant || null,
    service: serviceDoc._id,
    name: name || `${source.name} (copy)`,
    code: code || (await suggestOfferingCode({
      category: category.key, productType: productType?.name, variant: variantDoc?.label, service: serviceDoc.name,
    })),
    isActive: false,
    needsRateReview: true,
  });
  await copy.validate();
  await assertCombinationFree({ service: copy.service, productType: copy.productType, variant: copy.variant });
  await saveUnique(() => copy.save(), `Offering code ${copy.code} is already taken`);
  if (sourceRate) {
    await createRateVersion(
      copy._id,
      Object.fromEntries(RATE_MONEY_FIELDS.map((field) => [field, sourceRate[field]])),
      { reason: `Copied from ${source.code} — review before activating`, changedBy: actorId, needsRateReview: true },
    );
  }
  await logAudit({ user: actorId, action: `Catalogue: duplicated ${source.code} as ${copy.code}`, type: 'System' });
  return getOffering(copy._id);
}

// ─── Rates ───────────────────────────────────────────────────────────────

const scopeLabel = (scope) => (scope.type === 'DEFAULT' ? 'default' : `${scope.type === 'CITY' ? 'city' : 'pincode'} ${scope.value}`);

/**
 * One version chain per (offering, city): "Jaipur" and "jaipur" are the same
 * city, so an existing override's spelling is reused. Pincodes are digits.
 */
async function canonicalScope(offeringId, scope) {
  if (!scope || scope.type === 'DEFAULT') return { type: 'DEFAULT', value: null };
  const value = scope.value.trim();
  if (scope.type === 'PINCODE') return { type: 'PINCODE', value };
  const existing = await OfferingRate.findOne({
    offering: offeringId,
    'scope.type': 'CITY',
    'scope.value': new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  }).select('scope');
  return { type: 'CITY', value: existing?.scope.value || value };
}

export async function changeRate(id, { reason, effectiveFrom, scope: requested, ...amounts }, actorId) {
  const offering = await findOr404(ServiceOffering, id, 'Offering');
  const scope = await canonicalScope(offering._id, requested);
  const patch = Object.fromEntries(
    Object.entries(amounts).filter(([, value]) => value !== undefined).map(([field, value]) => [field, toPaise(value)]),
  );
  const rate = await createRateVersion(offering._id, patch, {
    reason,
    changedBy: actorId,
    effectiveFrom: effectiveFrom || new Date(),
    scope,
  });
  const summary = rate.changes.length
    ? rate.changes.map((c) => `${c.field} ₹${toRupees(c.from)} → ₹${toRupees(c.to)}`).join(', ')
    : `₹${toRupees(rate.customerPrice)} / payout ₹${toRupees(rate.spPayout)}`;
  await logAudit({
    user: actorId,
    action: `Catalogue: ${offering.code}${scope.type === 'DEFAULT' ? '' : ` ${scopeLabel(scope)}`} rate v${rate.version} — ${summary} (${reason})`,
    type: 'Finance',
  });
  return getOffering(offering._id);
}

/** Ends a city / pincode price now; that location goes back to the next scope's price. */
export async function endLocalRate(id, { scope: requested, reason }, actorId) {
  const offering = await findOr404(ServiceOffering, id, 'Offering');
  const scope = await canonicalScope(offering._id, requested);
  await endRateScope(offering._id, scope);
  await logAudit({ user: actorId, action: `Catalogue: ${offering.code} ${scopeLabel(scope)} price ended (${reason})`, type: 'Finance' });
  return getOffering(offering._id);
}

/** Active and scheduled city / pincode prices for offerings: { [offeringId]: [{ scope, rate }] }. */
async function localRatesFor(offeringIds, at = new Date()) {
  const rates = await OfferingRate.find({
    offering: { $in: offeringIds },
    'scope.type': { $ne: 'DEFAULT' },
    $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: at } }],
  })
    .sort({ version: -1 })
    .lean();
  const out = new Map();
  for (const rate of rates) {
    const key = String(rate.offering);
    if (!out.has(key)) out.set(key, []);
    const list = out.get(key);
    if (!list.some((r) => r.scope.type === rate.scope.type && r.scope.value === rate.scope.value)) {
      list.push({ scope: rate.scope, rate: rupeeRate(rate), scheduled: rate.effectiveFrom > at });
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.scope.type.localeCompare(b.scope.type) || a.scope.value.localeCompare(b.scope.value));
  return out;
}

function historyEntry(rate) {
  return {
    ...rupeeRate(rate),
    reason: rate.reason,
    changedBy: rate.changedBy ? { id: idOf(rate.changedBy), name: rate.changedBy.name } : null,
    createdAt: rate.createdAt,
    changes: (rate.changes || []).map((c) => ({ field: c.field, from: c.from == null ? null : toRupees(c.from), to: toRupees(c.to) })),
  };
}

export async function listRateHistory(id) {
  await findOr404(ServiceOffering, id, 'Offering');
  const rates = await OfferingRate.find({ offering: id }).populate('changedBy', 'name').sort({ 'scope.type': 1, version: -1 }).lean();
  return rates.map(historyEntry);
}

export async function listRateChanges({ from, to, field, page, limit } = {}) {
  const filter = { version: { $gt: 1 } };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }
  if (field) filter['changes.field'] = field;

  const { skip, limit: lim, page: pg } = parsePagination({ page, limit });
  const [rates, total] = await Promise.all([
    OfferingRate.find(filter)
      .populate('changedBy', 'name')
      .populate('offering', 'code name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    OfferingRate.countDocuments(filter),
  ]);
  return {
    items: rates.map((rate) => ({
      ...historyEntry(rate),
      offering: rate.offering ? { id: idOf(rate.offering), code: rate.offering.code, name: rate.offering.name } : null,
    })),
    meta: paginationMeta({ page: pg, limit: lim, total }),
  };
}

export async function suggestCode({ category, productType, variant, service }) {
  const [c, pt, v, s] = await Promise.all([
    category ? Category.findById(category).select('key') : null,
    productType ? ProductType.findById(productType).select('name') : null,
    variant ? Variant.findById(variant).select('label') : null,
    service ? CatalogService.findById(service).select('name') : null,
  ]);
  return { code: await suggestOfferingCode({ category: c?.key, productType: pt?.name, variant: v?.label, service: s?.name }) };
}
