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

/** Admin view of a category: every product type and service item (including
 * inactive ones), each keyed by its real id so the console can edit/delete
 * them — assembleCategory() only returns active services by slug, which is
 * right for the public/customer read but not enough for an editor. */
export async function getCategoryForAdmin(key) {
  const category = await findCategoryOr404(key);
  const [productTypes, services] = await Promise.all([
    ProductType.find({ category: category._id }).sort({ createdAt: 1 }),
    ServiceCatalogItem.find({ category: category._id }).sort({ createdAt: 1 }),
  ]);
  return {
    ...category.toJSON(),
    productTypes: productTypes.map((pt) => pt.toJSON()),
    services: services.map((s) => s.toJSON()),
  };
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

export async function addProductType(categoryKey, data) {
  const category = await findCategoryOr404(categoryKey);
  const productType = await ProductType.create({ category: category._id, ...data });
  return productType.toJSON();
}

export async function updateProductType(categoryKey, productTypeId, data) {
  const category = await findCategoryOr404(categoryKey);
  const productType = await ProductType.findOne({ _id: productTypeId, category: category._id });
  if (!productType) throw new ApiError(404, 'Product type not found in this category');
  Object.assign(productType, data);
  await productType.save();
  return productType.toJSON();
}

export async function deleteProductType(categoryKey, productTypeId) {
  const category = await findCategoryOr404(categoryKey);
  const result = await ProductType.deleteOne({ _id: productTypeId, category: category._id });
  if (result.deletedCount === 0) throw new ApiError(404, 'Product type not found in this category');
}

export async function addServiceItem(categoryKey, data) {
  const category = await findCategoryOr404(categoryKey);
  const item = await ServiceCatalogItem.create({ category: category._id, ...data });
  return item.toJSON();
}

export async function updateServiceItem(categoryKey, serviceItemId, data) {
  const category = await findCategoryOr404(categoryKey);
  const item = await ServiceCatalogItem.findOne({ _id: serviceItemId, category: category._id });
  if (!item) throw new ApiError(404, 'Service item not found in this category');
  Object.assign(item, data);
  await item.save();
  return item.toJSON();
}

export async function deleteServiceItem(categoryKey, serviceItemId) {
  const category = await findCategoryOr404(categoryKey);
  const result = await ServiceCatalogItem.deleteOne({ _id: serviceItemId, category: category._id });
  if (result.deletedCount === 0) throw new ApiError(404, 'Service item not found in this category');
}
