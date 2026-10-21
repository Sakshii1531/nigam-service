import { emitEligibleOffers } from '../modules/provider-onboarding/offerDispatch.js';
import { ApiError } from '../middleware/errorHandler.js';
import { assertJobEligible } from '../modules/provider-onboarding/eligibility.service.js';
import { acceptJob } from '../modules/service-provider/job.service.js';
import { Booking } from '../modules/booking/booking.model.js';
import { ServiceRequest } from '../modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../modules/service-provider/serviceProvider.model.js';
import { declineAssignment } from '../modules/service-requests/serviceRequest.service.js';
import { ROLES } from '../config/constants.js';

// ServiceProviders who are online and listening for ASAP work. Exported because
// booking.service.js announces new instant requests into this same room —
// broadcasting them to every connected socket would hand a customer's name,
// phone number and street address to every other logged-in user.
export const INSTANT_ROOM = 'instant:serviceProviders';

export function registerInstantBookingGateway(io) {
  io.on('connection', (socket) => {
    // ServiceProviders join instant job broadcast room. Role-gated for the same
    // reason the room exists at all: what gets published here is customer
    // contact and address data, so a customer or brand-admin socket asking to
    // join must be turned away rather than quietly added.
    socket.on('join-instant-feed', async (_payload, ack) => {
      if (socket.user?.role !== ROLES.SERVICE_PROVIDER) {
        return ack?.({ ok: false, error: 'serviceProvider role required' });
      }
      try {
        const provider = await ServiceProvider.findOne({ user: socket.user.id });
        await assertJobEligible(provider);
        if (provider.availability !== 'Available') return ack?.({ ok: false, error: 'Go online to receive offers' });
      } catch (error) { return ack?.({ ok: false, error: error.message }); }
      socket.join(INSTANT_ROOM);
      socket.join('serviceProviders');
      if (socket.user?.id) {
        socket.join(`service-provider:${socket.user.id}`);
        try {
          const provider = await ServiceProvider.findOne({ user: socket.user.id }).populate("city");
          if (provider) {
            socket.join(`service-provider:${provider._id}`);
            // Re-joining after a service city change: leave the old city's
            // broadcast room so the provider stops getting its open offers.
            for (const room of socket.rooms) {
              if (room.startsWith("city:")) socket.leave(room);
            }
            const cityName = provider.serviceCityName || provider.city?.name;
            if (cityName) {
              socket.join(`city:${cityName.toLowerCase().trim()}`);
            }
          }
        } catch {
          // ignore error finding provider record
        }
      }
      return ack?.({ ok: true, room: INSTANT_ROOM });
    });

    // Turning down an instant job. Without this the popup could only be hidden
    // client-side, so the request stayed pinned to the service provider who ignored
    // it and no one else was ever offered the work.
    socket.on('instant:reject_job', async ({ serviceRequestId }, ack) => {
      try {
        if (socket.user.role !== ROLES.SERVICE_PROVIDER) {
          return ack?.({ ok: false, error: 'serviceProvider role required' });
        }
        const serviceProvider = await ServiceProvider.findOne({ user: socket.user.id });
        if (!serviceProvider) return ack?.({ ok: false, error: 'ServiceProvider profile not found' });

        const result = await declineAssignment(serviceRequestId, String(serviceProvider._id));

        // Put it back in front of everyone still listening, so the next
        // service provider sees it immediately rather than on their next refresh.
        const sr = await ServiceRequest.findById(serviceRequestId).populate('booking');
        await emitEligibleOffers(io, {
          bookingId: sr?.booking?.id || null,
          serviceRequestId: sr?.id,
          category: sr?.category,
          instantStatus: sr?.instantStatus,
          assignedServiceProviderId: sr?.serviceProvider ? String(sr.serviceProvider) : null,
        }, { city: sr?.zone || sr?.booking?.address?.city, state: sr?.booking?.address?.state });

        return ack?.({ ok: true, ...result });
      } catch (err) {
        return ack?.({ ok: false, error: err.message });
      }
    });

    // Service Provider accepts an instant job request
    socket.on('instant:accept_job', async ({ bookingId, serviceRequestId }, ack) => {
      try {
        if (socket.user.role !== ROLES.SERVICE_PROVIDER) {
          return ack?.({ ok: false, error: 'serviceProvider role required' });
        }

        const serviceProvider = await ServiceProvider.findOne({ user: socket.user.id });
        if (!serviceProvider) return ack?.({ ok: false, error: 'ServiceProvider profile not found' });

        const booking = await Booking.findById(bookingId);
        if (!booking || String(booking.serviceRequest) !== String(serviceRequestId)) throw new ApiError(400, 'Booking and service request do not match');
        const job = await acceptJob(serviceProvider.id, serviceRequestId);
        ack?.({ ok: true, job, serviceProvider });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    // Service Provider updates en-route / in-progress status for instant booking
    socket.on('instant:update_status', async ({ bookingId, status }, ack) => {
      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return ack?.({ ok: false, error: 'Booking not found' });

        booking.instantStatus = status;
        if (status === 'IN_PROGRESS') {
          booking.status = 'Ongoing';
        } else if (status === 'COMPLETED') {
          booking.status = 'Completed';
        }
        await booking.save();

        if (booking.serviceRequest) {
          await ServiceRequest.findByIdAndUpdate(booking.serviceRequest, { instantStatus: status });
        }

        io.to(`user:${booking.user}`).emit('instant:status_update', {
          bookingId: booking.id,
          instantStatus: status,
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });
  });
}
