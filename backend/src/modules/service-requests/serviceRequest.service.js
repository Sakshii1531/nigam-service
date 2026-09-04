import { ServiceRequest } from './serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { rankTechnicians, findAvailableTechnician } from '../shared/assignmentEngine.js';
import { Technician } from '../technician/technician.model.js';
import { Booking } from '../booking/booking.model.js';
import { Job } from '../technician/job.model.js';
import { SERVICE_REQUEST_TRANSITIONS } from '../../config/constants.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

import { emit as emitNotification } from '../notifications/notification.service.js';
import { getIO } from '../../sockets/io.js';

/** `session` opts this write into a caller's transaction (see
 * utils/transaction.js) — createBooking uses it so a booking and its service
 * request can never be half-created. Omitted, it behaves exactly as before. */
export async function createServiceRequest(data, { session } = {}) {
  // Model.create takes an array when given options, otherwise it reads the
  // options object as a second document to insert.
  const [serviceRequest] = await ServiceRequest.create(
    [
      {
        ...data,
        status: 'New',
        timeline: [{ stepLabel: 'New', done: true, timestamp: new Date(), description: 'Request created' }],
      },
    ],
    session ? { session } : {},
  );

  // Inside a transaction this is deliberately NOT sent here: a notification is
  // an external side effect that cannot be rolled back, so telling a brand
  // about a claim whose write later aborts would be a lie. The caller that
  // owns the transaction re-runs this after the commit.
  if (!session) await emitWarrantyClaimNotification(serviceRequest);

  return serviceRequest;
}

/** Post-commit half of createServiceRequest's brand notification. Safe to call
 * with any service request — it no-ops unless the claim actually qualifies. */
export async function emitWarrantyClaimNotification(serviceRequest) {
  if (!serviceRequest?.brand || serviceRequest.warranty !== 'In Warranty') return;
  await emitNotification('brand.warranty_claim', {
    reason: `New Brand Warranty claim raised for Service Request ${serviceRequest.humanId || serviceRequest.id}`,
  });
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
export async function transitionStatus(id, toStatus, { description, session } = {}) {
  // Read through the same session as the write, or the document created
  // moments ago inside an uncommitted transaction is invisible here.
  const serviceRequest = session
    ? await ServiceRequest.findById(id).session(session)
    : await findOr404(id);
  if (!serviceRequest) throw new ApiError(404, 'Service request not found');
  const allowed = SERVICE_REQUEST_TRANSITIONS[serviceRequest.status] || [];

  if (!allowed.includes(toStatus)) {
    throw new ApiError(
      400,
      `Cannot transition from "${serviceRequest.status}" to "${toStatus}" (allowed: ${allowed.join(', ') || 'none — terminal state'})`,
    );
  }

  serviceRequest.status = toStatus;
  serviceRequest.timeline.push({ stepLabel: toStatus, done: true, timestamp: new Date(), description });
  await serviceRequest.save(session ? { session } : undefined);
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
export function scheduleDispatchTimeout(serviceRequestId, technicianId, timeoutMs = 60000) {
  setTimeout(async () => {
    try {
      const sr = await ServiceRequest.findById(serviceRequestId);
      if (
        sr &&
        sr.status === 'Assigned' &&
        !sr.isAccepted &&
        String(sr.technician) === String(technicianId)
      ) {
        console.log(`[dispatch-cascade] 60s timeout expired for technician ${technicianId} on SR ${serviceRequestId}. Cascading to next nearest technician.`);
        await declineAssignment(serviceRequestId, technicianId);
      }
    } catch (err) {
      console.warn('[dispatch-cascade] Timeout cascade notice:', err.message);
    }
  }, timeoutMs);
}

/**
 * Assign a technician (named, or the engine's top pick) and move the request to
 * 'Assigned'. Only requests that have not been picked up yet are assignable.
 */
export async function assignTechnician(id, technicianId) {
  const serviceRequest = await findOr404(id);
  if (!['New', 'Assigned'].includes(serviceRequest.status)) {
    throw new ApiError(409, `Cannot assign a request in status "${serviceRequest.status}"`);
  }

  let booking = null;
  if (serviceRequest.booking) {
    booking = await Booking.findById(serviceRequest.booking);
  }

  let technician;
  if (technicianId) {
    technician = await Technician.findById(technicianId);
    if (!technician) throw new ApiError(404, 'Technician not found');
    if (technician.status !== 'Active') throw new ApiError(409, `Technician is ${technician.status}, not Active`);
  } else {
    technician = await findAvailableTechnician({
      category: serviceRequest.category,
      city: serviceRequest.zone || booking?.address?.city,
      state: booking?.address?.state,
      latitude: serviceRequest.customerLocation?.latitude || booking?.address?.latitude,
      longitude: serviceRequest.customerLocation?.longitude || booking?.address?.longitude,
      exclude: serviceRequest.declinedBy || [],
    });
    if (!technician) throw new ApiError(409, 'No available technician to assign');
  }

  serviceRequest.technician = technician._id;
  serviceRequest.isAccepted = false;
  serviceRequest.assignedAt = new Date();
  if (serviceRequest.status === 'New') serviceRequest.status = 'Assigned';
  if (serviceRequest.isInstant) serviceRequest.instantStatus = 'ASSIGNED';
  serviceRequest.timeline.push({
    stepLabel: 'Assigned',
    done: true,
    timestamp: new Date(),
    description: `Assigned to ${technician.name}`,
  });
  await serviceRequest.save();

  if (booking) {
    booking.technician = technician._id;
    booking.isAccepted = false;
    if (booking.isInstant) booking.instantStatus = 'ASSIGNED';
    await booking.save();
  }

  // Socket notification dispatched strictly to the targeted technician
  try {
    const io = getIO();
    const jobPayload = {
      bookingId: booking?.id || String(serviceRequest.booking),
      serviceRequestId: String(serviceRequest._id),
      category: serviceRequest.category,
      service: serviceRequest.description || 'Appliance Service',
      totalPrice: booking?.totalPrice || 299,
      estEarnings: Math.round((booking?.totalPrice || 299) * 0.3) || 150,
      isInstant: serviceRequest.isInstant,
      scheduledTime: booking?.timeSlot?.time || (serviceRequest.isInstant ? 'ASAP' : 'Scheduled'),
      scheduledDateLabel: booking?.timeSlot?.date || 'Today',
      assignedTechnicianId: String(technician._id),
      assignedTechnicianUserId: String(technician.user),
      instantStatus: serviceRequest.isInstant ? 'ASSIGNED' : null,
      isAvailableRequest: false,
    };
    io.to(`tech:${technician._id}`).emit('job:assigned', jobPayload);
    io.to(`tech:${technician.user}`).emit('job:assigned', jobPayload);
    io.to(`tech:${technician._id}`).emit('instant:new_request', jobPayload);
    io.to(`tech:${technician.user}`).emit('instant:new_request', jobPayload);
  } catch (_e) {
    // Socket emit optional
  }

  // Schedule auto-timeout cascade (60s)
  scheduleDispatchTimeout(serviceRequest._id, technician._id);

  await emitNotification('technician.assigned', {
    user: serviceRequest.user,
    technicianName: technician.name,
    serviceRequestId: serviceRequest.id,
  });

  return ServiceRequest.findById(id).populate('technician', 'name rating specs');
}

/**
 * A technician turns down a request that was assigned to them.
 *
 * There was no reject at all before: the technician app's "Decline" only
 * filtered the card out of local state, so the request stayed assigned to them
 * forever, reappeared on the next refresh, and was never offered to anybody
 * else. Rejecting has to actually release the work — clear the assignee, put
 * the request back in the pool, remember who said no, and immediately look for
 * the next best technician.
 */
export async function declineAssignment(id, technicianId) {
  const serviceRequest = await findOr404(id);

  // If already at terminal states (Completed / Closed / Cancelled), cannot reject
  if (serviceRequest.status === 'Closed' || serviceRequest.status === 'Cancelled' || serviceRequest.status === 'Completed') {
    throw new ApiError(409, `Cannot reject a request in terminal status "${serviceRequest.status}"`);
  }

  // You can only decline your own assignment. There was no check at all, so any
  // technician who knew (or guessed) a request id could release somebody else's
  // job out from under them — the caller's id was accepted and only ever used to
  // record who declined. listAvailableJobs only ever surfaces requests assigned
  // to the caller, so this is exactly the set the technician app can act on.
  if (String(serviceRequest.technician || '') !== String(technicianId || '')) {
    throw new ApiError(403, 'This request is not assigned to you');
  }

  // Once it has been accepted there is a Job carrying real progress (travel,
  // diagnosis, parts, earnings). This used to fall straight through to
  // Job.deleteMany() below, so a late decline silently destroyed that work.
  // Same rule the available-jobs feed uses: any Job at all takes it out of play.
  if (await Job.exists({ serviceRequest: serviceRequest._id })) {
    throw new ApiError(409, 'This request has already been accepted and can no longer be rejected');
  }

  if (technicianId && !serviceRequest.declinedBy.some((t) => String(t) === String(technicianId))) {
    serviceRequest.declinedBy.push(technicianId);
  }
  serviceRequest.technician = null;
  serviceRequest.status = 'New';
  if (serviceRequest.isInstant) serviceRequest.instantStatus = 'SEARCHING';
  serviceRequest.timeline.push({
    stepLabel: 'New',
    done: true,
    timestamp: new Date(),
    description: 'Declined by technician — searching for another technician',
  });
  await serviceRequest.save();

  // The customer's screens read the booking, so it has to let go of the
  // technician too or they keep seeing someone who is not coming.
  let customerUserId = null;
  if (serviceRequest.booking) {
    const booking = await Booking.findById(serviceRequest.booking);
    if (booking) {
      customerUserId = booking.user ? String(booking.user._id || booking.user) : null;
      booking.technician = null;
      if (booking.isInstant) booking.instantStatus = 'SEARCHING';
      booking.status = 'Upcoming';
      await booking.save();
    }
  } else if (serviceRequest.user) {
    customerUserId = String(serviceRequest.user._id || serviceRequest.user);
  }

  // Emit realtime updates to the customer and technician rooms
  try {
    const io = getIO();
    if (customerUserId) {
      io.to(`user:${customerUserId}`).emit('instant:status_update', {
        bookingId: serviceRequest.booking ? String(serviceRequest.booking) : null,
        serviceRequestId: serviceRequest.id,
        instantStatus: 'SEARCHING',
        technician: null,
      });
      io.to(`user:${customerUserId}`).emit('service_request:updated', {
        serviceRequestId: serviceRequest.id,
        status: 'New',
        technician: null,
      });
      io.to(`user:${customerUserId}`).emit('booking:updated', {
        bookingId: serviceRequest.booking ? String(serviceRequest.booking) : null,
        technician: null,
      });
    }
    io.to('instant:technicians').emit('instant:status_update', {
      bookingId: serviceRequest.booking ? String(serviceRequest.booking) : null,
      serviceRequestId: serviceRequest.id,
      instantStatus: 'SEARCHING',
      technician: null,
    });
  } catch {
    // Socket might not be initialized during isolated tests
  }

  // Offer it to the next best technician right away. Nobody else being
  // available is a normal outcome — it stays queued for the next sweep.
  let reassignedTo = null;
  try {
    const updated = await assignTechnician(String(serviceRequest._id), null);
    reassignedTo = updated.technician?.name || null;
  } catch {
    reassignedTo = null;
  }

  return { declined: true, reassignedTo };
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
