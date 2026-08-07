import { SparePartCatalog } from './sparePartCatalog.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listSpareParts({ page, limit, sort } = {}) {
  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    SparePartCatalog.find().sort(sortObj).skip(skip).limit(lim),
    SparePartCatalog.countDocuments(),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOr404(id) {
  const part = await SparePartCatalog.findById(id);
  if (!part) throw new ApiError(404, 'Spare part not found');
  return part;
}

export async function createSparePart(data) {
  return SparePartCatalog.create(data);
}

const EDITABLE_FIELDS = ['name', 'brand', 'code', 'category', 'costPrice', 'markupPercent', 'stock', 'reorderThreshold', 'supplier', 'leadTimeDays'];

export async function updateSparePart(id, updates) {
  const part = await findOr404(id);
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) part[field] = updates[field];
  }
  await part.save();
  return part;
}

export async function deleteSparePart(id) {
  const part = await findOr404(id);
  await part.deleteOne();
}
