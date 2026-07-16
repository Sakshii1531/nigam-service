import { Escalation } from './escalation.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { emit as emitNotification } from '../notifications/notification.service.js';

// Super-admin only ever works the 'platform' scope slice of this collection —
// 'brand' scope belongs to a brand-admin Escalations.jsx surface that hasn't
// been built yet (not in Phase 7's shipped list either — a real, documented gap).

export async function listEscalations({ status, priority, city, page, limit, sort } = {}) {
  const query = { scope: 'platform' };
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (city) query.city = city;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Escalation.find(query).sort(sortObj).skip(skip).limit(lim),
    Escalation.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findPlatformOr404(id) {
  const escalation = await Escalation.findById(id);
  if (!escalation) throw new ApiError(404, 'Escalation not found');
  if (escalation.scope !== 'platform') throw new ApiError(403, 'Not a platform-scope escalation');
  return escalation;
}

export async function getEscalation(id) {
  return findPlatformOr404(id);
}

export async function createEscalation({ serviceRequest, city, reason, description, raisedBy, priority }) {
  const escalation = await Escalation.create({ scope: 'platform', serviceRequest, city, reason, description, raisedBy, priority });
  await emitNotification('escalation.raised', { reason });
  return escalation;
}

export async function assignManager(id, managerId) {
  const escalation = await findPlatformOr404(id);
  escalation.manager = managerId;
  if (escalation.status === 'Unassigned' || escalation.status === 'Open') escalation.status = 'In Progress';
  await escalation.save();
  return escalation;
}

export async function updateStatus(id, status) {
  const escalation = await findPlatformOr404(id);
  escalation.status = status;
  await escalation.save();
  return escalation;
}
