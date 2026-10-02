import mongoose from 'mongoose';
import { WarrantyGroup } from './warrantyGroup.model.js';
import { WarrantyIssue } from './warrantyIssue.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { Category } from '../catalog/category.model.js';
import { ProductType } from '../catalog/productType.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { logAudit } from '../shared/auditLog.js';
import { escapeRegex } from '../shared/brandWarranty.js';
import { ApiError } from '../../middleware/errorHandler.js';

// What a customer picks in the Partner Warranty flow — group → brand →
// product (a Master Catalogue category) → issue — and the admin/brand tools
// that manage it (docs/partner-warranty Phase 2). Nothing here is hardcoded;
// the app renders whatever these return.

const byOrder = { sortOrder: 1, name: 1 };

/** A brand the customer app may offer: active and switched on for warranty. */
const LISTED_BRAND = { status: 'Active', warrantyEnabled: true };

const isObjectId = (v) => mongoose.isValidObjectId(v) && String(new mongoose.Types.ObjectId(v)) === String(v);

function categoryView(c) {
  return { id: String(c._id), key: c.key, name: c.name, imageUrl: c.imageUrl || null, icon: c.icon || null };
}

function brandView(b) {
  return { id: String(b._id), name: b.name, logoUrl: b.logoUrl || null };
}

function groupView(g) {
  return {
    id: String(g._id),
    name: g.name,
    slug: g.slug,
    tagline: g.tagline || '',
    imageUrl: g.imageUrl || null,
    sortOrder: g.sortOrder,
    isActive: g.isActive,
  };
}

function issueView(i) {
  return {
    id: String(i._id),
    name: i.name,
    icon: i.icon || null,
    category: String(i.category),
    productType: i.productType ? String(i.productType) : null,
    sortOrder: i.sortOrder,
    isActive: i.isActive,
  };
}

/** Group by id or slug; only active ones unless `includeInactive`. */
async function findGroup(ref, { includeInactive = false } = {}) {
  const filter = isObjectId(ref) ? { _id: ref } : { slug: String(ref).toLowerCase() };
  if (!includeInactive) filter.isActive = true;
  const group = await WarrantyGroup.findOne(filter).lean();
  if (!group) throw new ApiError(404, 'Warranty category not found');
  return group;
}

async function activeCategoryIds(ids) {
  const cats = await Category.find({ _id: { $in: ids }, isActive: true }).select('_id').lean();
  return cats.map((c) => c._id);
}

// ── Customer reads ───────────────────────────────────────────────────────────

export async function listGroups() {
  const groups = await WarrantyGroup.find({ isActive: true }).sort(byOrder).lean();
  // brandCount lets the app grey out (or hide) a group no brand serves yet,
  // rather than letting the customer tap into an empty list.
  return Promise.all(
    groups.map(async (g) => {
      const cats = await activeCategoryIds(g.categories);
      const brandCount = cats.length ? await Brand.countDocuments({ ...LISTED_BRAND, coverage: { $in: cats } }) : 0;
      return { ...groupView(g), brandCount };
    }),
  );
}

/** Brands offered to customers, optionally within one group and/or matching a name search. */
export async function listBrands({ group, q } = {}) {
  const filter = { ...LISTED_BRAND };
  if (group) {
    const g = await findGroup(group);
    filter.coverage = { $in: await activeCategoryIds(g.categories) };
  }
  if (q && q.trim()) filter.name = new RegExp(escapeRegex(q.trim()), 'i');
  const brands = await Brand.find(filter).sort({ name: 1 }).limit(200).lean();
  return brands.map(brandView);
}

async function findListedBrand(brandId) {
  if (!isObjectId(brandId)) throw new ApiError(404, 'Brand not found');
  const brand = await Brand.findOne({ _id: brandId, ...LISTED_BRAND }).lean();
  if (!brand) throw new ApiError(404, 'Brand not found');
  return brand;
}

/** The "Product" step: categories this brand covers (within the group, when given). */
export async function listBrandProducts(brandId, { group } = {}) {
  const brand = await findListedBrand(brandId);
  let ids = brand.coverage || [];
  if (group) {
    const g = await findGroup(group);
    const inGroup = new Set(g.categories.map(String));
    ids = ids.filter((id) => inGroup.has(String(id)));
  }
  const cats = await Category.find({ _id: { $in: ids }, isActive: true }).sort(byOrder).lean();
  return { brand: brandView(brand), products: cats.map(categoryView) };
}

/**
 * Issues for a product (category). A product type's own issues replace the
 * category's when it has any; otherwise the category-level list is used.
 */
export async function listIssues(categoryId, { productType } = {}) {
  if (!isObjectId(categoryId)) throw new ApiError(404, 'Product not found');
  const category = await Category.findOne({ _id: categoryId, isActive: true }).lean();
  if (!category) throw new ApiError(404, 'Product not found');

  let issues = [];
  if (productType) {
    if (!isObjectId(productType)) throw new ApiError(400, 'Invalid product type');
    issues = await WarrantyIssue.find({ category: category._id, productType, isActive: true }).sort(byOrder).lean();
  }
  if (!issues.length) {
    issues = await WarrantyIssue.find({ category: category._id, productType: null, isActive: true }).sort(byOrder).lean();
  }
  return { product: categoryView(category), issues: issues.map((i) => ({ id: String(i._id), name: i.name, icon: i.icon || null })) };
}

/**
 * Resolves and checks a customer's picks in one go — used by claim submission
 * (Phase 3) so a claim can never reference a brand that doesn't cover the
 * product, or an issue from another product.
 */
export async function resolveSelection({ brandId, categoryId, issueId, productTypeId }) {
  const brand = await findListedBrand(brandId);
  if (!isObjectId(categoryId)) throw new ApiError(400, 'Choose a product');
  const category = await Category.findOne({ _id: categoryId, isActive: true }).lean();
  if (!category) throw new ApiError(400, 'Choose a product');
  if (!(brand.coverage || []).some((id) => String(id) === String(category._id))) {
    throw new ApiError(400, `${brand.name} does not accept warranty claims for ${category.name}`);
  }

  let productType = null;
  if (productTypeId) {
    productType = await ProductType.findOne({ _id: productTypeId, category: category._id }).lean();
    if (!productType) throw new ApiError(400, 'That product type does not belong to this product');
  }

  if (!isObjectId(issueId)) throw new ApiError(400, 'Choose an issue');
  const issue = await WarrantyIssue.findOne({ _id: issueId, category: category._id, isActive: true }).lean();
  if (!issue) throw new ApiError(400, 'That issue does not belong to this product');

  return { brand, category, productType, issue };
}

// ── Super Admin: groups ──────────────────────────────────────────────────────

async function assertCategories(ids = []) {
  const unique = [...new Set(ids.map(String))];
  const found = await Category.countDocuments({ _id: { $in: unique } });
  if (found !== unique.length) throw new ApiError(400, 'One or more categories do not exist');
  return unique;
}

async function groupWithCategories(id) {
  const g = await WarrantyGroup.findById(id).populate('categories', 'key name imageUrl icon isActive').lean();
  return { ...groupView(g), categories: (g.categories || []).map(categoryView) };
}

export async function adminListGroups() {
  const groups = await WarrantyGroup.find().sort(byOrder).select('_id').lean();
  return Promise.all(groups.map((g) => groupWithCategories(g._id)));
}

function duplicateSlug(err) {
  if (err?.code === 11000) return new ApiError(409, 'A warranty category with that slug already exists');
  return err;
}

export async function createGroup(data, actorId) {
  if (data.categories) data.categories = await assertCategories(data.categories);
  try {
    const group = await WarrantyGroup.create(data);
    await logAudit({ user: actorId, type: 'Warranty', action: `Partner warranty: created group ${group.name}` });
    return groupWithCategories(group._id);
  } catch (err) {
    throw duplicateSlug(err);
  }
}

export async function updateGroup(id, data, actorId) {
  if (data.categories) data.categories = await assertCategories(data.categories);
  try {
    const group = await WarrantyGroup.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!group) throw new ApiError(404, 'Warranty category not found');
    await logAudit({ user: actorId, type: 'Warranty', action: `Partner warranty: updated group ${group.name}` });
    return groupWithCategories(group._id);
  } catch (err) {
    throw duplicateSlug(err);
  }
}

// ── Super Admin: issues ──────────────────────────────────────────────────────

export async function adminListIssues({ category, productType } = {}) {
  const filter = {};
  if (category) filter.category = category;
  if (productType !== undefined) filter.productType = productType || null;
  const issues = await WarrantyIssue.find(filter).sort(byOrder).lean();
  return issues.map(issueView);
}

async function assertIssueScope({ category, productType }) {
  if (!(await Category.exists({ _id: category }))) throw new ApiError(400, 'Category does not exist');
  if (productType && !(await ProductType.exists({ _id: productType, category }))) {
    throw new ApiError(400, 'That product type does not belong to this category');
  }
}

export async function createIssue(data, actorId) {
  await assertIssueScope(data);
  const issue = await WarrantyIssue.create({ ...data, productType: data.productType || null });
  await logAudit({ user: actorId, type: 'Warranty', action: `Partner warranty: created issue ${issue.name}` });
  return issueView(issue);
}

export async function updateIssue(id, data, actorId) {
  const issue = await WarrantyIssue.findById(id);
  if (!issue) throw new ApiError(404, 'Issue not found');
  const next = { category: data.category ?? issue.category, productType: data.productType === undefined ? issue.productType : data.productType };
  await assertIssueScope(next);
  Object.assign(issue, data, { productType: next.productType || null });
  await issue.save();
  await logAudit({ user: actorId, type: 'Warranty', action: `Partner warranty: updated issue ${issue.name}` });
  return issueView(issue);
}

/** Claims keep the issue's name, so deleting one never breaks an existing claim. */
export async function deleteIssue(id, actorId) {
  const issue = await WarrantyIssue.findByIdAndDelete(id);
  if (!issue) throw new ApiError(404, 'Issue not found');
  await logAudit({ user: actorId, type: 'Warranty', action: `Partner warranty: deleted issue ${issue.name}` });
  return { id: String(issue._id), deleted: true };
}

// ── Brand warranty settings (Super Admin, and the brand for its own coverage) ─

async function brandSettingsView(brandId) {
  const brand = await Brand.findById(brandId).populate('coverage', 'key name imageUrl icon isActive').lean();
  if (!brand) throw new ApiError(404, 'Brand not found');
  return {
    id: String(brand._id),
    name: brand.name,
    status: brand.status,
    warrantyEnabled: Boolean(brand.warrantyEnabled),
    warrantyMonths: brand.warrantyMonths ?? null,
    logoUrl: brand.logoUrl || null,
    coverage: (brand.coverage || []).map(categoryView),
    warrantySla: brand.warrantySla || {},
  };
}

export async function adminListBrands() {
  const brands = await Brand.find().sort({ name: 1 }).select('_id').lean();
  return Promise.all(brands.map((b) => brandSettingsView(b._id)));
}

export const getBrandSettings = brandSettingsView;

export async function updateBrandSettings(brandId, data, actorId, { asBrand = false } = {}) {
  const brand = await Brand.findById(brandId);
  if (!brand) throw new ApiError(404, 'Brand not found');

  // A brand chooses what it covers and its logo; whether it is listed to
  // customers at all, and its SLA, are platform decisions.
  const allowed = asBrand ? ['coverage', 'logoUrl'] : ['coverage', 'logoUrl', 'warrantyEnabled', 'warrantySla'];
  const changes = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  if (changes.coverage) changes.coverage = await assertCategories(changes.coverage);
  if (changes.warrantySla) changes.warrantySla = { ...(brand.warrantySla?.toObject?.() || brand.warrantySla || {}), ...changes.warrantySla };

  Object.assign(brand, changes);
  await brand.save();
  await logAudit({
    user: actorId,
    type: 'Warranty',
    action: `Partner warranty: ${asBrand ? 'brand' : 'admin'} updated ${brand.name} (${Object.keys(changes).join(', ') || 'no changes'})`,
  });
  return brandSettingsView(brand._id);
}

/** Every active category, for the coverage picker. */
export async function listCoverageOptions() {
  const cats = await Category.find({ isActive: true }).sort(byOrder).lean();
  return cats.map(categoryView);
}

// ── Partner warranty eligibility (Super Admin) ───────────────────────────────
// Which brands a service partner is authorized for, and where they serve
// warranty jobs (docs/partner-warranty Phase 6, ARCHITECTURE §6).

async function eligibilityView(providerId) {
  const sp = await ServiceProvider.findById(providerId)
    .select('name phone specs tier serviceCityName authorizedBrands servicePincodes serviceRadiusKm location status availability')
    .populate('authorizedBrands', 'name')
    .lean();
  if (!sp) throw new ApiError(404, 'Service partner not found');
  return {
    id: String(sp._id),
    name: sp.name,
    status: sp.status,
    availability: sp.availability,
    specs: sp.specs || [],
    tier: sp.tier,
    city: sp.serviceCityName || null,
    hasLocation: sp.location?.latitude != null && sp.location?.longitude != null,
    authorizedBrands: (sp.authorizedBrands || []).map((b) => ({ id: String(b._id), name: b.name })),
    servicePincodes: sp.servicePincodes || [],
    serviceRadiusKm: sp.serviceRadiusKm ?? null,
  };
}

export const getPartnerEligibility = eligibilityView;

export async function updatePartnerEligibility(providerId, data, actorId) {
  const sp = await ServiceProvider.findById(providerId);
  if (!sp) throw new ApiError(404, 'Service partner not found');

  if (data.authorizedBrands) {
    const unique = [...new Set(data.authorizedBrands.map(String))];
    if ((await Brand.countDocuments({ _id: { $in: unique } })) !== unique.length) {
      throw new ApiError(400, 'One or more brands do not exist');
    }
    sp.authorizedBrands = unique;
  }
  if (data.servicePincodes) sp.servicePincodes = [...new Set(data.servicePincodes)];
  if (data.serviceRadiusKm !== undefined) sp.serviceRadiusKm = data.serviceRadiusKm;
  await sp.save();

  await logAudit({
    user: actorId,
    type: 'Warranty',
    action: `Partner warranty: updated eligibility for ${sp.name} (${Object.keys(data).join(', ')})`,
  });
  return eligibilityView(sp._id);
}
