import { ServiceRequest } from './serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { rankTechnicians, findAvailableTechnician } from '../shared/assignmentEngine.js';
import { Technician } from '../technician/technician.model.js';
import { SERVICE_REQUEST_TRANSITIONS } from '../../config/constants.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

import { emit as emitNotification } from '../notifications/notification.service.js';

export async function createServiceRequest(data) {
  const serviceRequest = await ServiceRequest.create({
    ...data,
    status: 'New',
    timeline: [{ stepLabel: 'New', done: true, timestamp: new Date(), description: 'Request created' }],
  });

  if (serviceRequest.brand && serviceRequest.warranty === 'In Warranty') {
    await emitNotification('brand.warranty_claim', {
      reason: `New Brand Warranty claim raised for Service Request ${serviceRequest.humanId || serviceRequest.id}`,
    });
  }

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

/**
 * Same document with its technician resolved, for the detail views that render
 * a name. Deliberately separate from getServiceRequest: the authorization
 * helpers compare `String(sr.technician)` against an id, which a populated
 * document would silently break.
 */
export async function getServiceRequestDetail(id) {
  await findOr404(id);
  return ServiceRequest.findById(id).populate('technician', 'name rating specs');
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


export async function listServiceRequests({ user, technician, brand, status, page, limit, sort } = {}) {
  const query = {};
  if (user) query.user = user;
  if (technician) query.technician = technician;
  if (brand) query.brand = brand;
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    // Every consumer of this list (brand console, super-admin queues, the
    // customer's own history) renders names rather than ids, so resolve the
    // refs here instead of making each caller fan out.
    ServiceRequest.find(query)
      .populate('user', 'name email phone')
      .populate('technician', 'name phone')
      .populate('brand', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    ServiceRequest.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * Ranked shortlist for the assignment console, scored by the same weighted
 * engine that auto-assignment uses so the operator sees the real numbers.
 */
export async function suggestTechnicians(id) {
  const serviceRequest = await findOr404(id);
  const ranked = await rankTechnicians({ category: serviceRequest.category, city: serviceRequest.zone });
  return ranked.map(({ technician, score, proximity, skill, rating, workload }) => ({
    id: technician.id,
    name: technician.name,
    specs: technician.specs,
    rating: technician.rating,
    activeJobsCount: technician.activeJobsCount,
    city: technician.city?.name || null,
    score: Math.round(score),
    breakdown: { proximity, skill, rating, workload },
  }));
}

/**
 * Assign a technician (named, or the engine's top pick) and move the request to
 * 'Assigned'. Only requests that have not been picked up yet are assignable —
 * re-routing work already underway is a different operation with different
 * side-effects, and is deliberately not folded in here.
 */
export async function assignTechnician(id, technicianId) {
  const serviceRequest = await findOr404(id);
  if (!['New', 'Assigned'].includes(serviceRequest.status)) {
    throw new ApiError(409, `Cannot assign a request in status "${serviceRequest.status}"`);
  }

  let technician;
  if (technicianId) {
    technician = await Technician.findById(technicianId);
    if (!technician) throw new ApiError(404, 'Technician not found');
    if (technician.status !== 'Active') throw new ApiError(409, `Technician is ${technician.status}, not Active`);
  } else {
    technician = await findAvailableTechnician({ category: serviceRequest.category, city: serviceRequest.zone });
    if (!technician) throw new ApiError(409, 'No available technician to assign');
  }

  serviceRequest.technician = technician._id;
  if (serviceRequest.status === 'New') serviceRequest.status = 'Assigned';
  serviceRequest.timeline.push({
    stepLabel: 'Assigned',
    done: true,
    timestamp: new Date(),
    description: `Assigned to ${technician.name}`,
  });
  await serviceRequest.save();

  return ServiceRequest.findById(id).populate('technician', 'name rating specs');
}
