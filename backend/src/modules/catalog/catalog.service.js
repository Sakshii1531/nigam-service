import { Category } from './category.model.js';
import { ProductType } from './productType.model.js';
import { CatalogService } from './catalogService.model.js';
import { ServiceOffering } from './serviceOffering.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

/**
 * One category for browsing screens (category grids, the services list, the
 * partner application): its visuals plus the product types and services that
 * have an active Master Catalogue offering. Names only — prices come from the
 * category tree / search / quote APIs (docs/master-catalogue), never from here.
 */
async function assembleCategory(category) {
  const offerings = await ServiceOffering.find({ category: category._id, isActive: true }).select('productType service').lean();
  const productTypeIds = [...new Set(offerings.map((o) => o.productType).filter(Boolean).map(String))];
  const serviceIds = [...new Set(offerings.map((o) => String(o.service)))];
  const [productTypes, services] = await Promise.all([
    ProductType.find({ _id: { $in: productTypeIds }, isActive: true }).sort({ sortOrder: 1, name: 1 }),
    CatalogService.find({ _id: { $in: serviceIds }, isActive: true }).sort({ sortOrder: 1, name: 1 }),
  ]);

  return {
    ...category.toJSON(),
    productTypes: productTypes.map((pt) => ({ id: pt.slug, name: pt.name, icon: pt.icon, desc: pt.desc })),
    services: services.map((s) => ({ id: s.slug, name: s.name, icon: s.icon, desc: s.desc })),
  };
}

export async function listCategories() {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  return Promise.all(categories.map(assembleCategory));
}

export async function getCategoryByKey(key) {
  return assembleCategory(await findCategoryOr404(key));
}

// Exact key only. This used to fall back to a case-insensitive match, then a
// name regex, then ANY active category — so a typo'd key silently edited (or
// priced a booking from) an unrelated category.
async function findCategoryOr404(key) {
  const category = await Category.findOne({ key });
  if (!category) throw new ApiError(404, `No category found for key "${key}"`);
  return category;
}

export async function createCategory(data) {
  const existing = await Category.findOne({ key: data.key });
  if (existing) throw new ApiError(409, `Category "${data.key}" already exists`);
  const category = await Category.create(data);
  return assembleCategory(category);
}

export async function updateCategory(key, data) {
  const category = await findCategoryOr404(key);
  Object.assign(category, data);
  await category.save();
  return assembleCategory(category);
}
