import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { logAudit } from '../shared/auditLog.js';

// Back-office verification of extended-warranty registrations against the dealer
// invoice the customer uploaded. This is deliberately NOT the Claim pipeline —
// a claim is a request to use cover that already exists, whereas this decides
// whether the cover was legitimately established in the first place.

export async function listRegistrations({ verificationStatus, search, page, limit, sort } = {}) {
  const query = {};
  if (verificationStatus) query.verificationStatus = verificationStatus;

  if (search) {
    // Escape regex metacharacters so a search for "a+b" isn't compiled as a quantifier.
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ fullName: rx }, { email: rx }, { brand: rx }, { modelNumber: rx }];
  }

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ExtendedWarrantyOrder.find(query)
      .populate('user', 'name email phone')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    ExtendedWarrantyOrder.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getRegistration(id) {
  const order = await ExtendedWarrantyOrder.findById(id).populate('user', 'name email phone');
  if (!order) throw new ApiError(404, 'Warranty registration not found');
  return order;
}

/**
 * Approve or reject a registration. Re-deciding an already-decided registration
 * is allowed (an approval made in error has to be reversible), so this does not
 * gate on the current value — but each decision is written to the audit log.
 */
export async function updateVerification(id, { verificationStatus, verificationNote }, actingUserId) {
  const order = await ExtendedWarrantyOrder.findById(id);
  if (!order) throw new ApiError(404, 'Warranty registration not found');

  order.verificationStatus = verificationStatus;
  order.verifiedAt = new Date();
  if (verificationNote !== undefined) order.verificationNote = verificationNote;
  await order.save();

  await logAudit({
    user: actingUserId,
    action: `${verificationStatus} warranty registration ${order.humanId || order.id}`,
    type: 'System',
  });

  return order.populate('user', 'name email phone');
}
