import { Job } from '../modules/service-provider/job.model.js';
import { ServiceProvider } from '../modules/service-provider/serviceProvider.model.js';
import { upsertTracking } from '../modules/super-admin/liveTracking.service.js';
import { getAsmByUserId } from '../modules/super-admin/asm.service.js';
import { ROLES } from '../config/constants.js';

const TRACKING_ROOM = 'tracking:super-admin';
const asmRoom = (cityId) => `tracking:city:${cityId}`;

/**
 * Live GPS feed for the Tracking.jsx console. A service provider's client
 * emits their own job's location; every super-admin client that joined the
 * shared tracking room gets the broadcast. This is the real write path the
 * Phase 8 liveTracking.routes.js's PUT endpoint predicted ("a service
 * provider's live GPS ping is Phase 9's Socket.IO handler, not this HTTP
 * route"). An ASM (role-scoped access inside the same super-admin panel —
 * see App.jsx's route guard) joins a per-city room instead of the shared
 * one, so update-location fans each ping out to both.
 */
export function registerTrackingGateway(io) {
  io.on('connection', (socket) => {
    socket.on('join-tracking', async (_payload, ack) => {
      if (socket.user.role === ROLES.SUPER_ADMIN) {
        socket.join(TRACKING_ROOM);
        return ack?.({ ok: true });
      }
      if (socket.user.role === ROLES.ASM) {
        try {
          const asm = await getAsmByUserId(socket.user.id);
          const cityId = asm.city?.id || asm.city?._id || asm.city;
          if (!cityId) return ack?.({ ok: false, error: 'No zone assigned yet' });
          socket.join(asmRoom(cityId));
          return ack?.({ ok: true });
        } catch (err) {
          return ack?.({ ok: false, error: err.message });
        }
      }
      return ack?.({ ok: false, error: 'super_admin or asm role required' });
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
        if (serviceProvider.city) io.to(asmRoom(serviceProvider.city)).emit('tracking:update', tracking.toJSON());
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });
  });
}
