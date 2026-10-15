import { ReplacementApproval } from './replacementApproval.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { User } from '../auth/user.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Job } from '../service-provider/job.model.js';

export async function listReplacementApprovals(brandId, { status, page, limit, sort, format, q } = {}) {
  // Scope the linked job too: legacy rows may have a correct brand on the
  // replacement but a forged/deleted service-request reference.
  const ownedJobs = await ServiceRequest.find({ brand: brandId }).select('_id serviceProvider').lean();
  const partnerByJob = new Map(ownedJobs.map(job => [String(job._id), new Set([String(job.serviceProvider || '')])]));
  const historicalJobs = await Job.find({ serviceRequest: { $in: ownedJobs.map(job => job._id) } }).select('serviceRequest serviceProvider').lean();
  for (const job of historicalJobs) partnerByJob.get(String(job.serviceRequest))?.add(String(job.serviceProvider));
  const query = { brand: brandId, serviceRequest: { $in: ownedJobs.map(job => job._id) } };
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
      .populate({ path: 'serviceRequest', match: { brand: brandId }, select: 'humanId', populate: { path: 'user', select: 'name' } })
      .populate('serviceProvider', 'name')
      .sort(sortObj)
      .skip(format ? 0 : skip)
      .limit(format ? 10001 : lim),
    ReplacementApproval.countDocuments(query),
  ]);
  for (const item of items) {
    // Do not disclose a foreign partner stored on an inconsistent legacy row.
    if (item.serviceProvider && !partnerByJob.get(String(item.serviceRequest?._id))?.has(String(item.serviceProvider._id))) item.serviceProvider = null;
  }
  if (format && items.length > 10000) throw new ApiError(400, 'Narrow filters to export at most 10000 replacements');
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOwnedOr404(brandId, id) {
  const approval = await ReplacementApproval.findOne({ _id: id, brand: brandId });
  if (!approval) throw new ApiError(404, 'Replacement approval not found');
  const job = await ServiceRequest.findOne({ _id: approval.serviceRequest, brand: brandId }).select('serviceProvider').lean();
  if (!job) throw new ApiError(404, 'Replacement approval not found');
  if (approval.serviceProvider && String(approval.serviceProvider) !== String(job.serviceProvider) && !await Job.exists({ serviceRequest: approval.serviceRequest, serviceProvider: approval.serviceProvider })) throw new ApiError(404, 'Replacement approval not found');
  return approval;
}

export async function getReplacementApproval(brandId, id) {
  return findOwnedOr404(brandId, id);
}

/** No dedicated service provider-side "request a replacement" flow exists yet (out of
 * Phase 6's scope), so this doubles as the entry point for logging one, not just
 * a decision endpoint. */
export async function createReplacementApproval(brandId, { serviceRequest, product, model, reason, serviceProviderNotes, serviceProvider }) {
  const job = await ServiceRequest.findOne({ _id: serviceRequest, brand: brandId }).select('serviceProvider').lean();
  if (!job) throw new ApiError(404, 'Service request not found');
  if (serviceProvider && String(serviceProvider) !== String(job.serviceProvider) && !await Job.exists({ serviceRequest, serviceProvider })) throw new ApiError(400, 'Service partner must be assigned to this job');
  return ReplacementApproval.create({ brand: brandId, serviceRequest, product, model, reason, serviceProviderNotes, serviceProvider: serviceProvider || job.serviceProvider || null });
}

export async function updateReplacementApprovalStatus(brandId, id, status) {
  const approval = await findOwnedOr404(brandId, id);
  approval.status = status;
  await approval.save();
  return approval;
}
