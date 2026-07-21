import { LiveTracking } from './liveTracking.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listActiveTracking() {
  return LiveTracking.find({ status: { $ne: 'Completed' } })
    .sort({ updatedAt: -1 })
    .populate({
      path: 'job',
      populate: {
        path: 'serviceRequest',
        populate: { path: 'user', select: 'name' },
      },
    })
    .populate({
      path: 'technician',
      populate: { path: 'user', select: 'name' },
    });
}

export async function getTrackingForJob(jobId) {
  const tracking = await LiveTracking.findOne({ job: jobId })
    .populate({
      path: 'job',
      populate: {
        path: 'serviceRequest',
        populate: { path: 'user', select: 'name' },
      },
    })
    .populate({
      path: 'technician',
      populate: { path: 'user', select: 'name' },
    });
  if (!tracking) throw new ApiError(404, 'No tracking record for this job');
  return tracking;
}

/** Upserted on each location ping — a real Socket.IO handler lands in Phase 9;
 * this HTTP endpoint is the same write path a polling fallback or manual
 * super-admin correction would use. */
export async function upsertTracking({ job, technician, status, eta, location, coords }) {
  const doc = await LiveTracking.findOneAndUpdate(
    { job },
    { job, technician, status, eta, location, coords },
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
      path: 'technician',
      populate: { path: 'user', select: 'name' },
    },
  ]);
}
