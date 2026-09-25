import { CatalogueBrand } from './catalogueBrand.model.js';
import { Category } from './category.model.js';
import { logAudit } from '../shared/auditLog.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Catalogue brands (docs/master-catalogue Phase 19) — the manufacturer list a
// customer picks from on product-linked bookings, the Buy screens and the
// warranty checks. Managed in Super Admin → Categories & Brands → Catalogue
// Brands. Partner brands (brand-admin logins) live in Brand Partners.

const toView = (brand) => ({
  id: String(brand._id),
  name: brand.name,
  categories: brand.categories || [],
  warrantyMonths: brand.warrantyMonths,
  isActive: brand.isActive,
  sortOrder: brand.sortOrder,
});

const byOrder = { sortOrder: 1, name: 1 };

/** Customer list: active brands, optionally only those offered under one category key. */
export async function listPublicBrands({ category } = {}) {
  const filter = { isActive: true, ...(category ? { categories: category } : {}) };
  const brands = await CatalogueBrand.find(filter).sort(byOrder).lean();
  return brands.map(({ name, categories, warrantyMonths }) => ({ name, categories: categories || [], warrantyMonths }));
}

/** Brand names shown on a category's booking flow — only product-linked bookings ask for one. */
export async function brandNamesForCategory(key) {
  const brands = await CatalogueBrand.find({ isActive: true, categories: key }).sort(byOrder).select('name').lean();
  return brands.map((b) => b.name);
}

export async function listBrands() {
  const brands = await CatalogueBrand.find().sort(byOrder);
  return brands.map(toView);
}

async function assertCategoriesExist(keys = []) {
  if (!keys.length) return;
  const found = await Category.find({ key: { $in: keys } }).distinct('key');
  const unknown = keys.filter((k) => !found.includes(k));
  if (unknown.length) throw new ApiError(400, `Unknown category: ${unknown.join(', ')}`);
}

async function saveUnique(work, name) {
  try {
    return await work();
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, `Brand "${name}" already exists`);
    throw err;
  }
}

export async function createBrand(data, actorId) {
  await assertCategoriesExist(data.categories);
  const brand = await saveUnique(() => CatalogueBrand.create(data), data.name);
  await logAudit({ user: actorId, action: `Catalogue: created brand ${brand.name}`, type: 'System' });
  return toView(brand);
}

export async function updateBrand(id, data, actorId) {
  const brand = await CatalogueBrand.findById(id);
  if (!brand) throw new ApiError(404, 'Brand not found');
  await assertCategoriesExist(data.categories);
  brand.set(data);
  await saveUnique(() => brand.save(), data.name || brand.name);
  await logAudit({ user: actorId, action: `Catalogue: updated brand ${brand.name}`, type: 'System' });
  return toView(brand);
}

// Bookings and appliances keep the brand as plain text, so deleting a brand
// only removes it from future pickers.
export async function deleteBrand(id, actorId) {
  const brand = await CatalogueBrand.findByIdAndDelete(id);
  if (!brand) throw new ApiError(404, 'Brand not found');
  await logAudit({ user: actorId, action: `Catalogue: deleted brand ${brand.name}`, type: 'System' });
  return { id: String(brand._id) };
}
