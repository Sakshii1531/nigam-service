import { Technician } from './technician.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { autoAssignPendingRequests } from '../service-requests/serviceRequest.service.js';

const ONLINE = 'Available';

/**
 * The technician's own online/offline switch.
 *
 * Nothing could set this before: registration hardcodes 'Offline'
 * (technicianRegistration.routes.js) and the admin console only ever forces it
 * back to 'Offline' (adminTechnician.service.js). The only writer of
 * 'Available' was the seed script and the /_dev test route. Since
 * rankTechnicians hard-filters on availability: 'Available', that meant a real
 * technician was never a candidate — auto-assignment silently found nobody and
 * the assignment console's shortlist came back empty.
 */
export async function setAvailability(technicianId, availability) {
  const technician = await Technician.findById(technicianId);
  if (!technician) throw new ApiError(404, 'Technician not found');
  if (availability === ONLINE && technician.status !== 'Active') {
    throw new ApiError(
      409,
      `Your account is ${technician.status} — an admin has to activate it before you can go online`,
    );
  }

  const wasOffline = technician.availability !== ONLINE;
  technician.availability = availability;
  await technician.save();

  // Coming online is exactly when a request that had no candidate at booking
  // time becomes assignable, so drain the backlog now instead of leaving it for
  // the next booking (or for an admin to notice).
  const autoAssigned =
    availability === ONLINE && wasOffline
      ? await autoAssignPendingRequests()
      : { assignedCount: 0, assigned: [] };

  return { technician, autoAssigned };
}

export async function getProfile(technicianId) {
  const technician = await Technician.findById(technicianId).select('+payoutMethods.accountNo');
  if (!technician) throw new ApiError(404, 'Technician not found');
  return technician;
}

const EDITABLE_FIELDS = ['name', 'phone', 'email', 'address', 'specs'];

export async function updateProfile(technicianId, data) {
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) updates[field] = data[field];
  }
  const technician = await Technician.findByIdAndUpdate(technicianId, updates, { new: true });
  if (!technician) throw new ApiError(404, 'Technician not found');
  return technician;
}

function maskDetail(method) {
  if (method.type === 'bank' && method.accountNo) return `•••• ${method.accountNo.slice(-4)}`;
  if (method.type === 'upi' && method.upiId) return method.upiId;
  return method.detail;
}

export async function addPayoutMethod(technicianId, method) {
  const technician = await Technician.findById(technicianId);
  if (!technician) throw new ApiError(404, 'Technician not found');

  if (method.isPrimary) technician.payoutMethods.forEach((m) => { m.isPrimary = false; });
  technician.payoutMethods.push({ ...method, detail: maskDetail(method) });
  await technician.save();
  return technician;
}

export async function removePayoutMethod(technicianId, methodId) {
  const technician = await Technician.findById(technicianId);
  if (!technician) throw new ApiError(404, 'Technician not found');

  technician.payoutMethods = technician.payoutMethods.filter((m) => String(m._id) !== methodId);
  await technician.save();
  return technician;
}
