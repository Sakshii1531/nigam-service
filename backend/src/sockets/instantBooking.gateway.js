import { Booking } from '../modules/booking/booking.model.js';
import { ServiceRequest } from '../modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../modules/service-provider/serviceProvider.model.js';
import { transitionStatus, declineAssignment } from '../modules/service-requests/serviceRequest.service.js';
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
      socket.join(INSTANT_ROOM);
      socket.join('serviceProviders');
      if (socket.user?.id) {
        socket.join(`service-provider:${socket.user.id}`);
        try {
          const provider = await ServiceProvider.findOne({ user: socket.user.id });
          if (provider) {
            socket.join(`service-provider:${provider._id}`);
            if (provider.serviceCityName) {
              socket.join(`city:${provider.serviceCityName.toLowerCase().trim()}`);
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
        io.to(INSTANT_ROOM).emit('instant:new_request', {
          bookingId: sr?.booking?.id || null,
          serviceRequestId: sr?.id,
          category: sr?.category,
          instantStatus: sr?.instantStatus,
          assignedServiceProviderId: sr?.serviceProvider ? String(sr.serviceProvider) : null,
        });

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

        // Claim atomically. Reading the booking, checking `service provider`, then
        // saving is a check-then-set: two service providers tapping Accept at the same
        // moment both pass the check before either writes, and the second
        // silently overwrites the first — leaving the customer told that one
        // service provider is coming while a different one believes the job is theirs.
        // Matching on "unclaimed, or already mine" makes the winner the single
        // service provider whose update actually matched.
        const booking = await Booking.findOneAndUpdate(
          { _id: bookingId, $or: [{ serviceProvider: null }, { serviceProvider: serviceProvider._id }] },
          { serviceProvider: serviceProvider._id, instantStatus: 'ASSIGNED', isAccepted: true },
          { new: true },
        );
        if (!booking) {
          const exists = await Booking.exists({ _id: bookingId });
          return ack?.({
            ok: false,
            error: exists ? 'Job has already been accepted by another serviceProvider' : 'Booking not found',
          });
        }

        let sr = await ServiceRequest.findById(serviceRequestId || booking.serviceRequest);
        if (sr) {
          sr.serviceProvider = serviceProvider._id;
          sr.instantStatus = 'ASSIGNED';
          sr.isAccepted = true;
          sr.acceptedAt = new Date();
          await sr.save();
          sr = await transitionStatus(sr.id, 'Assigned', {
            description: `Instant booking accepted by ${serviceProvider.name}`,
          });
        }

        // The customer gets their service provider's details; the service provider room
        // gets the claim so the job disappears from everyone else's feed.
        const assignedPayload = {
          bookingId: booking.id,
          serviceRequestId: sr?.id,
          instantStatus: 'ASSIGNED',
          isAccepted: true,
          status: 'Engineer Accepted',
          serviceProvider: {
            id: serviceProvider._id,
            name: serviceProvider.name,
            phone: serviceProvider.phone,
            rating: serviceProvider.rating,
          },
        };
        io.to(`user:${booking.user}`).emit('instant:status_update', assignedPayload);
        io.to(`user:${booking.user}`).emit('booking:accepted', assignedPayload);
        io.to(INSTANT_ROOM).emit('instant:status_update', assignedPayload);

        ack?.({ ok: true, booking, serviceProvider });
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
