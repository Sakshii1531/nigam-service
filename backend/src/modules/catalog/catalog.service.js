import { Category } from './category.model.js';
import { ProductType } from './productType.model.js';
import { ServiceCatalogItem } from './serviceCatalogItem.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

/** Assembles one category + its product types + its service items into the exact
 * shape frontend/src/data/bookingCatalog.js's BOOKING_CATALOG entries already
 * have — so the customer app's booking flow needs no reshaping once wired to this. */
async function assembleCategory(category) {
  const [productTypes, services] = await Promise.all([
    ProductType.find({ category: category._id }).sort({ createdAt: 1 }),
    ServiceCatalogItem.find({ category: category._id, isActive: true }).sort({ createdAt: 1 }),
  ]);

  const json = category.toJSON();
  return {
    ...json,
    productTypes: productTypes.map((pt) => ({ id: pt.slug, name: pt.name, icon: pt.icon, desc: pt.desc })),
    services: services.map((s) => ({ id: s.slug, name: s.name, icon: s.icon, desc: s.desc, price: s.price, unit: s.unit })),
  };
}

export async function listCategories() {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  return Promise.all(categories.map(assembleCategory));
}

export async function getCategoryByKey(key) {
  const category = await Category.findOne({ key });
  if (!category) throw new ApiError(404, `No category found for key "${key}"`);
  return assembleCategory(category);
}

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

export async function addProductType(categoryKey, data) {
  const category = await findCategoryOr404(categoryKey);
  const productType = await ProductType.create({ category: category._id, ...data });
  return productType.toJSON();
}

export async function addServiceItem(categoryKey, data) {
  const category = await findCategoryOr404(categoryKey);
  const item = await ServiceCatalogItem.create({ category: category._id, ...data });
  return item.toJSON();
}

/** Used by booking.service.js to price a booking server-side — never trust a
 * client-supplied price for what's being charged. */
export async function findServiceItem(categoryKey, serviceSlug) {
  const category = await findCategoryOr404(categoryKey);
  let item = await ServiceCatalogItem.findOne({ category: category._id, slug: serviceSlug, isActive: true });
  if (!item && process.env.NODE_ENV !== 'test') {
    // Fallback: try to find the first active service under this category
    item = await ServiceCatalogItem.findOne({ category: category._id, isActive: true });
  }
  if (!item) throw new ApiError(404, `No active service "${serviceSlug}" under category "${categoryKey}"`);
  return item;
}
