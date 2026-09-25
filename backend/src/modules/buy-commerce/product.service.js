import { Product } from './product.model.js';
import { Order } from './order.model.js';
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

/** A duplicate SKU is a 409 the admin can fix, not a raw database error. */
async function saveUnique(work, sku) {
  try {
    return await work();
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, `SKU "${sku}" is already used by another product`);
    throw err;
  }
}

export async function createProduct(data) {
  return saveUnique(() => Product.create(data), data.sku);
}

// Load + save (not findByIdAndUpdate) so the model's main-image sync runs and
// the merged MRP/price pair can be checked.
export async function updateProduct(id, data) {
  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, 'Product not found');
  product.set(data);
  if (product.originalPrice != null && product.originalPrice < product.price) {
    throw new ApiError(400, 'MRP cannot be lower than the selling price');
  }
  await saveUnique(() => product.save(), product.sku);
  return product;
}

// ─── Super Admin → NCC Products (docs/master-catalogue Phase 20) ──────────

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Orders that actually sold something (a cancelled or unpaid-and-abandoned order did not).
const SOLD_STATUSES = ['Confirmed', 'Shipped', 'Delivered'];

async function salesByProduct(ids) {
  const rows = await Order.aggregate([
    { $match: { status: { $in: SOLD_STATUSES }, 'items.product': { $in: ids } } },
    { $unwind: '$items' },
    { $match: { 'items.product': { $in: ids } } },
    {
      $group: {
        _id: '$items.product',
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        orders: { $addToSet: '$_id' },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), { unitsSold: r.unitsSold, revenue: r.revenue, orders: r.orders.length }]));
}

const NO_SALES = { unitsSold: 0, revenue: 0, orders: 0 };

/** Every product (inactive too) with filters, paging and units sold. */
export async function listProductsForAdmin({ category, condition, search, status, stock, brand, page, limit, sort } = {}) {
  const query = {};
  if (category) query.category = category;
  if (condition) query.condition = condition;
  if (brand) query.brand = new RegExp(`^${escapeRegex(brand)}$`, 'i');
  if (status) query.isActive = status === 'active';
  if (stock === 'out') query.stock = { $lte: 0 };
  if (stock === 'in') query.$expr = { $gt: ['$stock', { $ifNull: ['$lowStockThreshold', 5] }] };
  if (stock === 'low') query.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 5] }] }] };
  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [{ name: rx }, { brand: rx }, { sku: rx }, { modelNumber: rx }];
  }
  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Product.find(query).sort(sortObj).skip(skip).limit(lim),
    Product.countDocuments(query),
  ]);
  const sales = await salesByProduct(items.map((p) => p._id));
  return {
    items: items.map((p) => ({ ...p.toJSON(), sales: sales.get(String(p._id)) || NO_SALES })),
    meta: paginationMeta({ page: pg, limit: lim, total }),
  };
}

/** One product for the admin detail page: the listing plus sales and its latest orders. */
export async function getProductForAdmin(id) {
  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, 'Product not found');
  const [sales, recent] = await Promise.all([
    salesByProduct([product._id]),
    Order.find({ 'items.product': product._id }).sort({ createdAt: -1 }).limit(10).populate('user', 'name phone').lean(),
  ]);
  return {
    ...product.toJSON(),
    sales: sales.get(String(product._id)) || NO_SALES,
    recentOrders: recent.map((o) => {
      const line = o.items.find((i) => String(i.product) === String(product._id));
      return {
        id: String(o._id),
        humanId: o.humanId || String(o._id),
        customer: o.user?.name || o.user?.phone || '—',
        quantity: line?.quantity ?? 0,
        price: line?.price ?? 0,
        status: o.status,
        createdAt: o.createdAt,
      };
    }),
  };
}

/** Atomic stock decrement — the `stock: { $gte: qty }` guard means concurrent
 * checkouts can't both succeed past the last unit (same pattern as wallet.service.js). */
export async function decrementStock(id, qty) {
  const product = await Product.findOneAndUpdate({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { new: true });
  if (!product) throw new ApiError(400, 'Insufficient stock');
  return product;
}

// Soft-delete: orders reference products, so removing the document would break
// their history. Deactivating hides it from the storefront's listProducts.
export async function deactivateProduct(id) {
  const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}
