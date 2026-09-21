import { ServiceProviderInventoryItem } from './serviceProviderInventoryItem.model.js';
import { PartOrder } from './partOrder.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listInventory(serviceProviderId) {
  return ServiceProviderInventoryItem.find({ serviceProvider: serviceProviderId }).sort({ name: 1 });
}

import { Job } from './job.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Booking } from '../booking/booking.model.js';

export async function placePartOrder(serviceProviderId, { job, partName, sku, qty, price, orderSource }) {
  const partOrder = await PartOrder.create({ serviceProvider: serviceProviderId, job: job || null, partName, sku, qty, price, orderSource });

  if (job) {
    const jobDoc = await Job.findById(job);
    if (jobDoc?.serviceRequest) {
      const sr = await ServiceRequest.findById(jobDoc.serviceRequest);
      if (sr?.booking) {
        const booking = await Booking.findById(sr.booking);
        if (booking && (!booking.partApproval || booking.partApproval.status !== 'Approved')) {
          booking.partApproval = {
            status: 'Pending',
            partNames: [partName],
            amount: (Number(price) || 0) * (Number(qty) || 1),
            requestedAt: new Date(),
            respondedAt: null,
          };
          await booking.save();
        }
      }
    }
  }

  return partOrder;
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
