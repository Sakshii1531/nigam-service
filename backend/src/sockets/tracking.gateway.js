import { Job } from '../modules/service-provider/job.model.js';
import { ServiceProvider } from '../modules/service-provider/serviceProvider.model.js';
import { upsertTracking } from '../modules/super-admin/liveTracking.service.js';
import { ROLES } from '../config/constants.js';

const TRACKING_ROOM = 'tracking:super-admin';

/**
 * Live GPS feed for super-admin's Tracking.jsx. A service provider's client emits
 * their own job's location; every super-admin client that joined the shared
 * tracking room gets the broadcast. This is the real write path the Phase 8
 * liveTracking.routes.js's PUT endpoint predicted ("a service provider's live GPS
 * ping is Phase 9's Socket.IO handler, not this HTTP route").
 */
export function registerTrackingGateway(io) {
  io.on('connection', (socket) => {
    socket.on('join-tracking', (_payload, ack) => {
      if (socket.user.role !== ROLES.SUPER_ADMIN) {
        return ack?.({ ok: false, error: 'super_admin role required' });
      }
      socket.join(TRACKING_ROOM);
      ack?.({ ok: true });
    });

    socket.on('update-location', async ({ jobId, status, eta, location, coords }, ack) => {
      try {
        if (socket.user.role !== ROLES.SERVICE_PROVIDER) {
          return ack?.({ ok: false, error: 'serviceProvider role required' });
        }
        const serviceProvider = await ServiceProvider.findOne({ user: socket.user.id });
        if (!serviceProvider) return ack?.({ ok: false, error: 'No serviceProvider profile for this account' });

        const job = await Job.findById(jobId);
        if (!job || String(job.serviceProvider) !== serviceProvider.id) {
          return ack?.({ ok: false, error: 'Not authorized to update this job' });
        }

        const tracking = await upsertTracking({ job: jobId, serviceProvider: serviceProvider.id, status, eta, location, coords });

        io.to(TRACKING_ROOM).emit('tracking:update', tracking.toJSON());
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });
  });
}
