import { Claim } from '../warranty-amc-exchange/claim.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

/** Used both for a technician's manual FOC claim (RaisePartRequest.jsx's direct
 * flow) and internally by job.service.js when spare parts are used on a
 * warranty-covered job (auto-created, not technician-initiated). */
export async function raiseTechnicianClaim(technicianId, { serviceRequest, brand, claimType, item, amount, reason }) {
  return Claim.create({
    raisedByModel: 'Technician',
    raisedBy: technicianId,
    serviceRequest,
    brand,
    claimType,
    item,
    amount,
    reason,
  });
}

export async function listTechnicianClaims(technicianId, { status, page, limit, sort } = {}) {
  const query = { raisedByModel: 'Technician', raisedBy: technicianId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Claim.find(query).sort(sortObj).skip(skip).limit(lim),
    Claim.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getTechnicianClaim(technicianId, id) {
  const claim = await Claim.findById(id);
  if (!claim) throw new ApiError(404, 'Claim not found');
  if (claim.raisedByModel !== 'Technician' || String(claim.raisedBy) !== technicianId) {
    throw new ApiError(403, 'Not authorized to view this claim');
  }
  return claim;
}
