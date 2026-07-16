import { Product } from './product.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listProducts({ category, condition, search, page, limit, sort } = {}) {
  const query = { isActive: true };
  if (category) query.category = category;
  if (condition) query.condition = condition;
  if (search) query.$text = { $search: search };

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Product.find(query).sort(sortObj).skip(skip).limit(lim),
    Product.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getProduct(id) {
  const product = await Product.findById(id);
  if (!product || !product.isActive) throw new ApiError(404, 'Product not found');
  return product;
}

export async function createProduct(data) {
  return Product.create(data);
}

export async function updateProduct(id, data) {
  const product = await Product.findByIdAndUpdate(id, data, { new: true });
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}

/** Atomic stock decrement — the `stock: { $gte: qty }` guard means concurrent
 * checkouts can't both succeed past the last unit (same pattern as wallet.service.js). */
export async function decrementStock(id, qty) {
  const product = await Product.findOneAndUpdate({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { new: true });
  if (!product) throw new ApiError(400, 'Insufficient stock');
  return product;
}
