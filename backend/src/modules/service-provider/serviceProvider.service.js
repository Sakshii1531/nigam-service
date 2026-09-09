import { ServiceProvider } from './serviceProvider.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { autoAssignPendingRequests } from '../service-requests/serviceRequest.service.js';

const ONLINE = 'Available';

/**
 * The service provider's own online/offline switch.
 *
 * Nothing could set this before: registration hardcodes 'Offline'
 * (serviceProviderRegistration.routes.js) and the admin console only ever forces it
 * back to 'Offline' (adminServiceProvider.service.js). The only writer of
 * 'Available' was the seed script and the /_dev test route. Since
 * rankServiceProviders hard-filters on availability: 'Available', that meant a real
 * service provider was never a candidate — auto-assignment silently found nobody and
 * the assignment console's shortlist came back empty.
 */
export async function setAvailability(serviceProviderId, availability) {
  const serviceProvider = await ServiceProvider.findById(serviceProviderId);
  if (!serviceProvider) throw new ApiError(404, 'Service Provider not found');
  if (availability === ONLINE && serviceProvider.status !== 'Active') {
    throw new ApiError(
      409,
      `Your account is ${serviceProvider.status} — an admin has to activate it before you can go online`,
    );
  }

  const wasOffline = serviceProvider.availability !== ONLINE;
  serviceProvider.availability = availability;
  await serviceProvider.save();

  // Coming online is exactly when a request that had no candidate at booking
  // time becomes assignable, so drain the backlog now instead of leaving it for
  // the next booking (or for an admin to notice).
  const autoAssigned =
    availability === ONLINE && wasOffline
      ? await autoAssignPendingRequests()
      : { assignedCount: 0, assigned: [] };

  return { serviceProvider, autoAssigned };
}

export async function getProfile(serviceProviderId) {
  const serviceProvider = await ServiceProvider.findById(serviceProviderId).select('+payoutMethods.accountNo');
  if (!serviceProvider) throw new ApiError(404, 'Service Provider not found');
  return serviceProvider;
}

const EDITABLE_FIELDS = ['name', 'phone', 'email', 'address', 'specs'];

export async function updateProfile(serviceProviderId, data) {
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) updates[field] = data[field];
  }
  const serviceProvider = await ServiceProvider.findByIdAndUpdate(serviceProviderId, updates, { new: true });
  if (!serviceProvider) throw new ApiError(404, 'Service Provider not found');
  return serviceProvider;
}

function maskDetail(method) {
  if (method.type === 'bank' && method.accountNo) return `•••• ${method.accountNo.slice(-4)}`;
  if (method.type === 'upi' && method.upiId) return method.upiId;
  return method.detail;
}

export async function addPayoutMethod(serviceProviderId, method) {
  const serviceProvider = await ServiceProvider.findById(serviceProviderId);
  if (!serviceProvider) throw new ApiError(404, 'Service Provider not found');

  if (method.isPrimary) serviceProvider.payoutMethods.forEach((m) => { m.isPrimary = false; });
  serviceProvider.payoutMethods.push({ ...method, detail: maskDetail(method) });
  await serviceProvider.save();
  return serviceProvider;
}

export async function removePayoutMethod(serviceProviderId, methodId) {
  const serviceProvider = await ServiceProvider.findById(serviceProviderId);
  if (!serviceProvider) throw new ApiError(404, 'Service Provider not found');

  serviceProvider.payoutMethods = serviceProvider.payoutMethods.filter((m) => String(m._id) !== methodId);
  await serviceProvider.save();
  return serviceProvider;
}
