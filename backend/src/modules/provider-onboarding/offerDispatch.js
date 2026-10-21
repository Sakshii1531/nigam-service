import { rankServiceProviders, inWarrantyServiceArea } from '../shared/assignmentEngine.js';
import { searchHasExpired } from '../shared/dispatchPolicy.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
export async function emitEligibleOffers(io, payload, { city, state } = {}) {
  if (!io || !payload.serviceRequestId) return;
  const request = await ServiceRequest.findById(payload.serviceRequestId).populate('booking');
  if (request?.booking && ['Cancelled', 'Completed'].includes(request.booking.status)) return;
  if (!request || request.isAccepted || !['New', 'Assigned'].includes(request.status) || searchHasExpired(request, request.booking)) return;
  // Warranty offers use the targeted assignment path, never the open pool.
  if (request.warrantyClaim) return;
  const area = { city: request.zone || request.booking?.address?.city || city || payload.city, state: request.booking?.address?.state || state, pincode: request.pincode || request.booking?.address?.pincode, latitude: request.customerLocation?.latitude ?? request.booking?.address?.latitude, longitude: request.customerLocation?.longitude ?? request.booking?.address?.longitude };
  if (!area.city) return;
  const candidates = await rankServiceProviders({ category: request.category, ...area });
  for (const candidate of candidates) {
    const provider = candidate.serviceProvider;
    if (request.serviceProvider && String(request.serviceProvider) !== String(provider._id)) continue;
    if (request.declinedBy?.some(id => String(id) === String(provider._id))) continue;
    if (!provider.user || !inWarrantyServiceArea(provider, area)) continue;
    for (const event of ['job:new_available', 'instant:new_request', 'instant:job_offered']) io.to(`user:${provider.user}`).emit(event, payload);
  }
}
