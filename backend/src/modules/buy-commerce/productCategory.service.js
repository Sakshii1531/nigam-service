import { ProductCategory } from './productCategory.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

/** Default seed data — applied on first request if the collection is empty. */
const SEED_CATEGORIES = [
  { name: 'Television',     slug: 'television',      icon: '📺', sortOrder: 1 },
  { name: 'Refrigerator',   slug: 'refrigerator',    icon: '🧊', sortOrder: 2 },
  { name: 'Washing Machine',slug: 'washing-machine', icon: '🫧', sortOrder: 3 },
  { name: 'Air Conditioner',slug: 'air-conditioner', icon: '❄️', sortOrder: 4 },
  { name: 'Water Purifier', slug: 'water-purifier',  icon: '💧', sortOrder: 5 },
  { name: 'Geyser',         slug: 'geyser',          icon: '🔥', sortOrder: 6 },
  { name: 'Microwave Oven', slug: 'microwave-oven',  icon: '⏱️', sortOrder: 7 },
  { name: 'Others',         slug: 'others',          icon: '📦', sortOrder: 99 },
];

async function ensureSeed() {
  const count = await ProductCategory.countDocuments();
  if (count === 0) {
    await ProductCategory.insertMany(SEED_CATEGORIES);
  }
}

/** Public — returns active categories sorted by sortOrder. */
export async function listProductCategories() {
  await ensureSeed();
  return ProductCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
}

/** Admin — returns ALL categories including inactive. */
export async function listAllProductCategories() {
  await ensureSeed();
  return ProductCategory.find().sort({ sortOrder: 1, name: 1 });
}

export async function getProductCategory(id) {
  const cat = await ProductCategory.findById(id);
  if (!cat) throw new ApiError(404, 'Product category not found');
  return cat;
}

export async function createProductCategory(data) {
  try {
    return await ProductCategory.create(data);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'A category with this name or slug already exists');
    throw err;
  }
}

export async function updateProductCategory(id, data) {
  const cat = await ProductCategory.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!cat) throw new ApiError(404, 'Product category not found');
  return cat;
}

/** Soft-delete by toggling isActive = false rather than deleting the document,
 * since existing Product records reference the category name as a string and
 * historical data must stay readable. */
export async function deleteProductCategory(id) {
  const cat = await ProductCategory.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!cat) throw new ApiError(404, 'Product category not found');
  return cat;
}

