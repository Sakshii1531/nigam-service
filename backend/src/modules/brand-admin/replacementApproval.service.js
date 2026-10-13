import { ReplacementApproval } from './replacementApproval.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { User } from '../auth/user.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';

export async function listReplacementApprovals(brandId, { status, page, limit, sort, format, q } = {}) {
  const query = { brand: brandId };
  if (status) query.status = status;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({ name: rx }).distinct('_id');
    const requests = await ServiceRequest.find({ brand: brandId, user: { $in: users } }).distinct('_id');
    query.$or = [{ humanId: rx }, { serviceRequest: { $in: requests } }];
  }

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    // The approvals queue is decided on at a glance, so it needs the originating
    // ticket, who raised it and which customer it affects — not bare refs.
    ReplacementApproval.find(query)
      .populate({ path: 'serviceRequest', select: 'humanId', populate: { path: 'user', select: 'name' } })
      .populate('serviceProvider', 'name')
      .sort(sortObj)
      .skip(format ? 0 : skip)
      .limit(format ? 10001 : lim),
    ReplacementApproval.countDocuments(query),
  ]);
  if (format && items.length > 10000) throw new ApiError(400, 'Narrow filters to export at most 10000 replacements');
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

/** No dedicated service provider-side "request a replacement" flow exists yet (out of
 * Phase 6's scope), so this doubles as the entry point for logging one, not just
 * a decision endpoint. */
export async function createReplacementApproval(brandId, { serviceRequest, product, model, reason, serviceProviderNotes, serviceProvider }) {
  return ReplacementApproval.create({ brand: brandId, serviceRequest, product, model, reason, serviceProviderNotes, serviceProvider: serviceProvider || null });
}

export async function updateReplacementApprovalStatus(brandId, id, status) {
  const approval = await findOwnedOr404(brandId, id);
  approval.status = status;
  await approval.save();
  return approval;
}
