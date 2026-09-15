import { LiveTracking } from './liveTracking.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

/**
 * cityId scopes the feed to one zone (an ASM's — resolved server-side in
 * liveTracking.routes.js, never client-supplied). Two queries rather than an
 * aggregation $lookup: LiveTracking has no city of its own, only through
 * serviceProvider, and this list is small/short-lived (active jobs only) so
 * the extra round-trip doesn't matter.
 */
export async function listActiveTracking(cityId) {
  const query = { status: { $ne: 'Completed' } };
  if (cityId) {
    const ids = await ServiceProvider.find({ city: cityId }).distinct('_id');
    query.serviceProvider = { $in: ids };
  }
  return LiveTracking.find(query)
    .sort({ updatedAt: -1 })
    .populate({
      path: 'job',
      populate: {
        path: 'serviceRequest',
        populate: { path: 'user', select: 'name' },
      },
    })
    .populate({
      path: 'serviceProvider',
      select: 'name phone user city',
      populate: { path: 'user', select: 'name phone' },
    });
}

export async function getTrackingForJob(jobId, cityId) {
  const tracking = await LiveTracking.findOne({ job: jobId })
    .populate({
      path: 'job',
      populate: {
        path: 'serviceRequest',
        populate: { path: 'user', select: 'name' },
      },
    })
    .populate({
      path: 'serviceProvider',
      select: 'name phone user city',
      populate: { path: 'user', select: 'name phone' },
    });
  if (!tracking) throw new ApiError(404, 'No tracking record for this job');
  // Same 404-not-403 pattern as adminServiceProvider.service.js's findOr404
  // — an ASM probing a job id outside their zone can't tell "not mine" from
  // "doesn't exist".
  if (cityId && String(tracking.serviceProvider?.city) !== String(cityId)) {
    throw new ApiError(404, 'No tracking record for this job');
  }
  return tracking;
}

/** Upserted on each location ping — a real Socket.IO handler lands in Phase 9;
 * this HTTP endpoint is the same write path a polling fallback or manual
 * super-admin correction would use. */
export async function upsertTracking({ job, serviceProvider, status, eta, location, coords }) {
  const doc = await LiveTracking.findOneAndUpdate(
    { job },
    { job, serviceProvider, status, eta, location, coords },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc.populate([
    {
      path: 'job',
      populate: {
        path: 'serviceRequest',
        populate: { path: 'user', select: 'name' },
      },
    },
    {
      path: 'serviceProvider',
      populate: { path: 'user', select: 'name' },
    },
  ]);
}
