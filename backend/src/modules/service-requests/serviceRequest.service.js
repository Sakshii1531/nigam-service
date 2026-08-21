import { ServiceRequest } from './serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { rankTechnicians, findAvailableTechnician } from '../shared/assignmentEngine.js';
import { Technician } from '../technician/technician.model.js';
import { Booking } from '../booking/booking.model.js';
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
  const ranked = await rankTechnicians({
    category: serviceRequest.category,
    city: serviceRequest.zone,
    // The operator is overriding auto-assignment, so they get every Active
    // technician — including the Busy/Offline ones auto-assign skips. The
    // shortlist used to be filtered to Available only, which meant that with
    // nobody online it came back empty and the "Assign Technician" button had
    // nothing to select: manual assignment was impossible precisely when
    // automatic assignment had already failed.
    includeUnavailable: true,
  });
  return ranked.map(({ technician, score, proximity, skill, rating, workload }) => ({
    id: technician.id,
    name: technician.name,
    specs: technician.specs,
    rating: technician.rating,
    activeJobsCount: technician.activeJobsCount,
    // Surfaced so the console can mark who is actually online — an operator
    // picking an Offline technician should be able to see that they are.
    availability: technician.availability,
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
  if (serviceRequest.isInstant) serviceRequest.instantStatus = 'ASSIGNED';
  serviceRequest.timeline.push({
    stepLabel: 'Assigned',
    done: true,
    timestamp: new Date(),
    description: `Assigned to ${technician.name}`,
  });
  await serviceRequest.save();

  // The customer's booking screens read Booking.technician, not the service
  // request behind it. A console assignment only ever touched the
  // ServiceRequest, so the customer kept seeing an unassigned booking (and an
  // instant booking stayed stuck on "SEARCHING") no matter what the admin did.
  if (serviceRequest.booking) {
    const booking = await Booking.findById(serviceRequest.booking);
    if (booking) {
      booking.technician = technician._id;
      if (booking.isInstant) booking.instantStatus = 'ASSIGNED';
      await booking.save();
    }
  }

  await emitNotification('technician.assigned', {
    user: serviceRequest.user,
    technicianName: technician.name,
    serviceRequestId: serviceRequest.id,
  });

  return ServiceRequest.findById(id).populate('technician', 'name rating specs');
}

/**
 * Drains the backlog of requests that were created while nobody was online.
 *
 * Auto-assignment used to run exactly once, inside createBooking: if no
 * technician was Available at that instant the request was written with
 * technician: null and nothing ever looked at it again, so it sat in the
 * super-admin queue forever. This is called when a technician comes online —
 * the moment a previously-unassignable request becomes assignable.
 */
export async function autoAssignPendingRequests({ limit = 25 } = {}) {
  const pending = await ServiceRequest.find({ technician: null, status: 'New' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select('_id');

  const assigned = [];
  for (const { _id } of pending) {
    try {
      // Sequential on purpose: each assignment feeds the workload term the next
      // one is ranked against, so these must not run in parallel or the whole
      // backlog lands on whoever happens to rank first.
      const updated = await assignTechnician(String(_id), null);
      assigned.push(updated.humanId || String(_id));
    } catch {
      // No eligible technician for this one, or it moved on under us. Leave it
      // queued for the next sweep rather than failing the whole batch.
    }
  }

  return { assignedCount: assigned.length, assigned };
}
