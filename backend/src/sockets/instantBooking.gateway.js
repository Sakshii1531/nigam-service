import { Booking } from '../modules/booking/booking.model.js';
import { ServiceRequest } from '../modules/service-requests/serviceRequest.model.js';
import { Technician } from '../modules/technician/technician.model.js';
import { transitionStatus } from '../modules/service-requests/serviceRequest.service.js';
import { ROLES } from '../config/constants.js';

// Technicians who are online and listening for ASAP work. Exported because
// booking.service.js announces new instant requests into this same room —
// broadcasting them to every connected socket would hand a customer's name,
// phone number and street address to every other logged-in user.
export const INSTANT_ROOM = 'instant:technicians';

export function registerInstantBookingGateway(io) {
  io.on('connection', (socket) => {
    // Technicians join instant job broadcast room. Role-gated for the same
    // reason the room exists at all: what gets published here is customer
    // contact and address data, so a customer or brand-admin socket asking to
    // join must be turned away rather than quietly added.
    socket.on('join-instant-feed', (_payload, ack) => {
      if (socket.user.role !== ROLES.TECHNICIAN) {
        return ack?.({ ok: false, error: 'technician role required' });
      }
      socket.join(INSTANT_ROOM);
      return ack?.({ ok: true, room: INSTANT_ROOM });
    });

    // Technician accepts an instant job request
    socket.on('instant:accept_job', async ({ bookingId, serviceRequestId }, ack) => {
      try {
        if (socket.user.role !== ROLES.TECHNICIAN) {
          return ack?.({ ok: false, error: 'technician role required' });
        }

        const technician = await Technician.findOne({ user: socket.user.id });
        if (!technician) return ack?.({ ok: false, error: 'Technician profile not found' });

        // Claim atomically. Reading the booking, checking `technician`, then
        // saving is a check-then-set: two technicians tapping Accept at the same
        // moment both pass the check before either writes, and the second
        // silently overwrites the first — leaving the customer told that one
        // technician is coming while a different one believes the job is theirs.
        // Matching on "unclaimed, or already mine" makes the winner the single
        // technician whose update actually matched.
        const booking = await Booking.findOneAndUpdate(
          { _id: bookingId, $or: [{ technician: null }, { technician: technician._id }] },
          { technician: technician._id, instantStatus: 'ASSIGNED' },
          { new: true },
        );
        if (!booking) {
          const exists = await Booking.exists({ _id: bookingId });
          return ack?.({
            ok: false,
            error: exists ? 'Job has already been accepted by another technician' : 'Booking not found',
          });
        }

        let sr = await ServiceRequest.findById(serviceRequestId || booking.serviceRequest);
        if (sr) {
          sr.technician = technician._id;
          sr.instantStatus = 'ASSIGNED';
          await sr.save();
          sr = await transitionStatus(sr.id, 'Assigned', {
            description: `Instant booking accepted by ${technician.name}`,
          });
        }

        // The customer gets their technician's details; the technician room
        // gets the claim so the job disappears from everyone else's feed.
        const assignedPayload = {
          bookingId: booking.id,
          serviceRequestId: sr?.id,
          instantStatus: 'ASSIGNED',
          technician: {
            id: technician._id,
            name: technician.name,
            phone: technician.phone,
            rating: technician.rating,
          },
        };
        io.to(`user:${booking.user}`).emit('instant:status_update', assignedPayload);
        io.to(INSTANT_ROOM).emit('instant:status_update', assignedPayload);

        ack?.({ ok: true, booking, technician });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    // Technician updates en-route / in-progress status for instant booking
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
