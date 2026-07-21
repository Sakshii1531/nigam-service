import { Escalation } from '../super-admin/escalation.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listBrandEscalations(brandId, { status, priority, page, limit, sort } = {}) {
  const query = { scope: 'brand', brand: brandId };
  if (status) query.status = status;
  if (priority) query.priority = priority;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });

  const [items, total] = await Promise.all([
    Escalation.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(lim)
      .populate({
        path: 'serviceRequest',
        populate: { path: 'user', select: 'name' },
      }),
    Escalation.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function createBrandEscalation(brandId, data) {
  return await Escalation.create({
    ...data,
    scope: 'brand',
    brand: brandId,
  });
}

export async function updateBrandEscalationStatus(brandId, escalationId, status) {
  const escalation = await Escalation.findOne({ _id: escalationId, scope: 'brand', brand: brandId });
  if (!escalation) {
    throw new ApiError(404, 'Escalation not found or access denied');
  }

  escalation.status = status;
  await escalation.save();
  return escalation;
}
