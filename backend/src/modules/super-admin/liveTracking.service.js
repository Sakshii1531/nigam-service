import { LiveTracking } from './liveTracking.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { Job } from '../service-provider/job.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

/**
 * cityId scopes the feed to one zone (an ASM's — resolved server-side in
 * liveTracking.routes.js, never client-supplied). Two queries rather than an
 * aggregation $lookup: LiveTracking has no city of its own, only through
 * serviceProvider, and this list is small/short-lived (active jobs only) so
 * the extra round-trip doesn't matter.
 */
export async function listActiveTracking(cityId) {
  // Ensure all currently active jobs have a LiveTracking document
  try {
    const activeJobs = await Job.find({
      activeStep: { $in: ['assigned', 'ontheway', 'inspection', 'spareapproval', 'repaircomplete', 'billing', 'revisit_scheduled', 'revisit_ontheway', 'revisit_arrived', 'revisit_complete'] },
    }).populate('serviceProvider').populate('serviceRequest');

    for (const job of activeJobs) {
      if (!job.serviceProvider) continue;
      const providerId = job.serviceProvider._id || job.serviceProvider.id || job.serviceProvider;
      const sr = job.serviceRequest;
      const sp = job.serviceProvider;
      const isTraveling = job.activeStep === 'ontheway' || job.activeStep === 'revisit_ontheway';
      const desiredStatus = isTraveling ? 'On the way' : 'Repairing';
      const lat = sr?.customerLocation?.latitude ?? sp?.location?.latitude ?? 28.6139;
      const lng = sr?.customerLocation?.longitude ?? sp?.location?.longitude ?? 77.2090;

      const existing = await LiveTracking.findOne({ job: job._id });
      if (!existing) {
        await LiveTracking.create({
          job: job._id,
          serviceProvider: providerId,
          status: desiredStatus,
          eta: '15 mins',
          location: sr?.zone || 'Customer Location',
          coords: { lat, lng },
        });
      } else {
        let dirty = false;
        if (existing.status !== desiredStatus) {
          existing.status = desiredStatus;
          dirty = true;
        }
        if (existing.coords?.lat == null || existing.coords?.lng == null) {
          existing.coords = { lat, lng };
          dirty = true;
        }
        if (dirty) await existing.save();
      }
    }
  } catch (syncErr) {
    console.warn('[liveTracking] auto-sync active jobs non-fatal error:', syncErr.message);
  }

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
