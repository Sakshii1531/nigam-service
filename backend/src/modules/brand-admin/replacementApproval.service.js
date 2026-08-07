import { ReplacementApproval } from './replacementApproval.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listReplacementApprovals(brandId, { status, page, limit, sort } = {}) {
  const query = { brand: brandId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    // The approvals queue is decided on at a glance, so it needs the originating
    // ticket, who raised it and which customer it affects — not bare refs.
    ReplacementApproval.find(query)
      .populate({ path: 'serviceRequest', select: 'humanId', populate: { path: 'user', select: 'name' } })
      .populate('technician', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    ReplacementApproval.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOwnedOr404(brandId, id) {
  const approval = await ReplacementApproval.findById(id);
  if (!approval) throw new ApiError(404, 'Replacement approval not found');
  if (String(approval.brand) !== brandId) throw new ApiError(403, 'Not authorized to access this replacement approval');
  return approval;
}

export async function getReplacementApproval(brandId, id) {
  return findOwnedOr404(brandId, id);
}

/** No dedicated technician-side "request a replacement" flow exists yet (out of
 * Phase 6's scope), so this doubles as the entry point for logging one, not just
 * a decision endpoint. */
export async function createReplacementApproval(brandId, { serviceRequest, product, model, reason, techNotes, technician }) {
  return ReplacementApproval.create({ brand: brandId, serviceRequest, product, model, reason, techNotes, technician: technician || null });
}

export async function updateReplacementApprovalStatus(brandId, id, status) {
  const approval = await findOwnedOr404(brandId, id);
  approval.status = status;
  await approval.save();
  return approval;
}
