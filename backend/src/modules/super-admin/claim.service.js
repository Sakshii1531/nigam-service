import { Claim } from '../warranty-amc-exchange/claim.model.js';
import { Technician } from '../technician/technician.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { emit as emitNotification } from '../notifications/notification.service.js';

// Platform-wide claim approval — a stand-in authority until Claim gets a real
// Brand ObjectId ref (it currently only has a free-text `brand` label String,
// see DATA_MODEL.md's Phase 7 addendum), which would let this move to
// brand-admin's own approve/reject surface instead.

export async function listClaims({ status, page, limit, sort } = {}) {
  const query = {};
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Claim.find(query).sort(sortObj).skip(skip).limit(lim),
    Claim.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOr404(id) {
  const claim = await Claim.findById(id);
  if (!claim) throw new ApiError(404, 'Claim not found');
  return claim;
}

export async function getClaim(id) {
  return findOr404(id);
}

/** Resolves the claim's raiser to a real User id for notification purposes —
 * a technician-raised claim's `raisedBy` points at a Technician doc, not a User. */
async function resolveRaiserUserId(claim) {
  if (claim.raisedByModel === 'User') return claim.raisedBy;
  const technician = await Technician.findById(claim.raisedBy);
  return technician ? technician.user : null;
}

export async function updateClaimStatus(id, status) {
  const claim = await findOr404(id);
  claim.status = status;
  await claim.save();

  if (status === 'Approved') {
    const userId = await resolveRaiserUserId(claim);
    if (userId) await emitNotification('claim.approved', { user: userId, item: claim.item });
  }

  return claim;
}
