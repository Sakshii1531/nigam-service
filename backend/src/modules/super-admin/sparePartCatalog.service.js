import { SparePartCatalog } from './sparePartCatalog.model.js';
import { SparePartStockMovement } from './sparePartStockMovement.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Super Admin → Inventory Management (docs/master-catalogue Phase 21). Every
// change to a part's stock writes a SparePartStockMovement, so the detail
// page can show exactly how the current number came about.

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listSpareParts({ page, limit, sort, search, category, brand, stock, status } = {}) {
  const query = {};
  if (category) query.$or = [{ category }, { compatibleCategories: category }];
  if (brand) query.brand = new RegExp(`^${escapeRegex(brand)}$`, 'i');
  if (status) query.isActive = status === 'active';
  if (stock === 'out') query.stock = { $lte: 0 };
  if (stock === 'in') query.$expr = { $gt: ['$stock', { $ifNull: ['$reorderThreshold', 5] }] };
  if (stock === 'low') query.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$reorderThreshold', 5] }] }] };
  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    const text = [{ name: rx }, { code: rx }, { brand: rx }, { humanId: rx }, { compatibleModels: rx }];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: text }];
      delete query.$or;
    } else query.$or = text;
  }
  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total, summary] = await Promise.all([
    SparePartCatalog.find(query).sort(sortObj).skip(skip).limit(lim),
    SparePartCatalog.countDocuments(query),
    inventorySummary(),
  ]);
  return { items, meta: { ...paginationMeta({ page: pg, limit: lim, total }), summary } };
}

/** Whole-catalogue figures for the Inventory header cards. */
async function inventorySummary() {
  const [row] = await SparePartCatalog.aggregate([
    {
      $group: {
        _id: null,
        parts: { $sum: 1 },
        units: { $sum: { $max: ['$stock', 0] } },
        stockValue: { $sum: { $multiply: ['$costPrice', { $max: ['$stock', 0] }] } },
        outOfStock: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } },
        lowStock: {
          $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$reorderThreshold', 5] }] }] }, 1, 0] },
        },
      },
    },
  ]);
  const { _id, ...rest } = row || { parts: 0, units: 0, stockValue: 0, outOfStock: 0, lowStock: 0 };
  return rest;
}

async function findOr404(id) {
  const part = await SparePartCatalog.findById(id);
  if (!part) throw new ApiError(404, 'Spare part not found');
  return part;
}

function recordMovement(part, { type, quantity, reason, userId }) {
  return SparePartStockMovement.create({ part: part._id, type, quantity, stockAfter: part.stock, reason, user: userId || null });
}

export async function getSparePart(id) {
  const part = await findOr404(id);
  const movements = await SparePartStockMovement.find({ part: part._id }).sort({ createdAt: -1 }).limit(50).populate('user', 'name email').lean();
  return {
    ...part.toJSON(),
    movements: movements.map((m) => ({
      id: String(m._id),
      type: m.type,
      quantity: m.quantity,
      stockAfter: m.stockAfter,
      reason: m.reason,
      by: m.user?.name || m.user?.email || null,
      createdAt: m.createdAt,
    })),
  };
}

export async function createSparePart(data, userId) {
  const part = await SparePartCatalog.create(data);
  if (part.stock > 0) await recordMovement(part, { type: 'OPENING', quantity: part.stock, reason: 'Opening stock', userId });
  return part;
}

const EDITABLE_FIELDS = [
  'name', 'brand', 'code', 'category', 'compatibleCategories', 'compatibleBrands', 'compatibleModels',
  'description', 'images', 'specifications', 'unit', 'warrantyMonths', 'costPrice', 'markupPercent',
  'gstPercent', 'hsnCode', 'stock', 'reorderThreshold', 'supplier', 'leadTimeDays', 'storageLocation', 'isActive',
];

export async function updateSparePart(id, updates, userId) {
  const part = await findOr404(id);
  const before = part.stock;
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) part[field] = updates[field];
  }
  await part.save();
  if (part.stock !== before) {
    await recordMovement(part, { type: 'ADJUSTMENT', quantity: part.stock - before, reason: updates.stockReason || 'Edited in the part form', userId });
  }
  return part;
}

/** Restock (+), issue (−) or adjust (±) with a reason — the stock history's main source. */
export async function changeStock(id, { type, quantity, reason }, userId) {
  const delta = type === 'ISSUE' ? -quantity : quantity;
  // Atomic, and never below zero.
  const part = await SparePartCatalog.findOneAndUpdate(
    { _id: id, ...(delta < 0 ? { stock: { $gte: -delta } } : {}) },
    { $inc: { stock: delta } },
    { new: true },
  );
  if (!part) {
    await findOr404(id);
    throw new ApiError(400, 'Not enough stock for that');
  }
  await recordMovement(part, { type, quantity: delta, reason, userId });
  return getSparePart(id);
}

export async function deleteSparePart(id) {
  const part = await findOr404(id);
  await part.deleteOne();
  await SparePartStockMovement.deleteMany({ part: part._id });
}
