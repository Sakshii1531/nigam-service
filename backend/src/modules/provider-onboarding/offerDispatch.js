import { rankServiceProviders } from '../shared/assignmentEngine.js';
export async function emitEligibleOffers(io, payload, { city, state } = {}) {
  if (!io) return;
  const candidates = await rankServiceProviders({ category: payload.category, city: city || payload.city, state });
  for (const candidate of candidates) {
    if (payload.assignedServiceProviderId && String(payload.assignedServiceProviderId) !== String(candidate.id || candidate._id)) continue;
    if (!candidate.user) continue;
    for (const event of ['job:new_available', 'instant:new_request', 'instant:job_offered']) io.to(`user:${candidate.user}`).emit(event, payload);
  }
}
