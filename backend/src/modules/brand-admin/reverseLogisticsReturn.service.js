import { ReverseLogisticsReturn } from './reverseLogisticsReturn.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listReturns(brandId, { status, page, limit, sort } = {}) {
  const query = { brand: brandId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ReverseLogisticsReturn.find(query).sort(sortObj).skip(skip).limit(lim),
    ReverseLogisticsReturn.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOwnedOr404(brandId, id) {
  const record = await ReverseLogisticsReturn.findById(id);
  if (!record) throw new ApiError(404, 'Return record not found');
  if (String(record.brand) !== brandId) throw new ApiError(403, 'Not authorized to access this return record');
  return record;
}

export async function getReturn(brandId, id) {
  return findOwnedOr404(brandId, id);
}

/** Same reasoning as replacementApproval.service.js's createReplacementApproval:
 * no technician-side "log a returned part" trigger exists yet, so this is the
 * entry point for now, logged by brand-admin/ops. */
export async function createReturn(brandId, { technician, partName, sku, serviceRequest, replaceDate }) {
  return ReverseLogisticsReturn.create({ brand: brandId, technician, partName, sku, serviceRequest: serviceRequest || null, replaceDate });
}

export async function updateReturn(brandId, id, updates) {
  const record = await findOwnedOr404(brandId, id);
  const EDITABLE_FIELDS = ['status', 'transitStatus', 'trackingNo', 'damageFlag'];
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) record[field] = updates[field];
  }
  await record.save();
  return record;
}
