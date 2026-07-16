import { ServiceRequest } from './serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { SERVICE_REQUEST_TRANSITIONS } from '../../config/constants.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function createServiceRequest(data) {
  const serviceRequest = await ServiceRequest.create({
    ...data,
    status: 'New',
    timeline: [{ stepLabel: 'New', done: true, timestamp: new Date(), description: 'Request created' }],
  });
  return serviceRequest;
}

async function findOr404(id) {
  const serviceRequest = await ServiceRequest.findById(id);
  if (!serviceRequest) throw new ApiError(404, 'Service request not found');
  return serviceRequest;
}

export async function getServiceRequest(id) {
  return findOr404(id);
}

/** Server-side transition validation — the frontend's own status enum is not
 * trusted as the source of truth for what moves are legal (Phase 4 exit
 * criterion: "status transitions validated server-side, not client-trusted"). */
export async function transitionStatus(id, toStatus, { description } = {}) {
  const serviceRequest = await findOr404(id);
  const allowed = SERVICE_REQUEST_TRANSITIONS[serviceRequest.status] || [];

  if (!allowed.includes(toStatus)) {
    throw new ApiError(
      400,
      `Cannot transition from "${serviceRequest.status}" to "${toStatus}" (allowed: ${allowed.join(', ') || 'none — terminal state'})`,
    );
  }

  serviceRequest.status = toStatus;
  serviceRequest.timeline.push({ stepLabel: toStatus, done: true, timestamp: new Date(), description });
  await serviceRequest.save();
  return serviceRequest;
}

export async function assignTechnician(id, technicianId) {
  const serviceRequest = await findOr404(id);
  serviceRequest.technician = technicianId;
  await serviceRequest.save();
  return serviceRequest;
}

export async function listServiceRequests({ user, technician, status, page, limit, sort } = {}) {
  const query = {};
  if (user) query.user = user;
  if (technician) query.technician = technician;
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ServiceRequest.find(query).sort(sortObj).skip(skip).limit(lim),
    ServiceRequest.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}
