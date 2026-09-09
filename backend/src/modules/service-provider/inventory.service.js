import { ServiceProviderInventoryItem } from './serviceProviderInventoryItem.model.js';
import { PartOrder } from './partOrder.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listInventory(serviceProviderId) {
  return ServiceProviderInventoryItem.find({ serviceProvider: serviceProviderId }).sort({ name: 1 });
}

export async function placePartOrder(serviceProviderId, { job, partName, sku, qty, price, orderSource }) {
  return PartOrder.create({ serviceProvider: serviceProviderId, job: job || null, partName, sku, qty, price, orderSource });
}

export async function listPartOrders(serviceProviderId, { status, page, limit, sort } = {}) {
  const query = { serviceProvider: serviceProviderId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    PartOrder.find(query).sort(sortObj).skip(skip).limit(lim),
    PartOrder.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getPartOrder(serviceProviderId, id) {
  const partOrder = await PartOrder.findById(id);
  if (!partOrder) throw new ApiError(404, 'Part order not found');
  if (String(partOrder.serviceProvider) !== serviceProviderId) throw new ApiError(403, 'Not authorized to view this part order');
  return partOrder;
}
