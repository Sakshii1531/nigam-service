import { TechInventoryItem } from './techInventoryItem.model.js';
import { PartOrder } from './partOrder.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listInventory(technicianId) {
  return TechInventoryItem.find({ technician: technicianId }).sort({ name: 1 });
}

export async function placePartOrder(technicianId, { job, partName, sku, qty, price, orderSource }) {
  return PartOrder.create({ technician: technicianId, job: job || null, partName, sku, qty, price, orderSource });
}

export async function listPartOrders(technicianId, { status, page, limit, sort } = {}) {
  const query = { technician: technicianId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    PartOrder.find(query).sort(sortObj).skip(skip).limit(lim),
    PartOrder.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getPartOrder(technicianId, id) {
  const partOrder = await PartOrder.findById(id);
  if (!partOrder) throw new ApiError(404, 'Part order not found');
  if (String(partOrder.technician) !== technicianId) throw new ApiError(403, 'Not authorized to view this part order');
  return partOrder;
}
