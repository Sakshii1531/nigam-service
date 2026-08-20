import { Booking } from '../modules/booking/booking.model.js';
import { ServiceRequest } from '../modules/service-requests/serviceRequest.model.js';
import { Technician } from '../modules/technician/technician.model.js';
import { transitionStatus } from '../modules/service-requests/serviceRequest.service.js';
import { ROLES } from '../config/constants.js';

const INSTANT_ROOM = 'instant:technicians';

export function registerInstantBookingGateway(io) {
  io.on('connection', (socket) => {
    // Technicians join instant job broadcast room
    socket.on('join-instant-feed', (_payload, ack) => {
      socket.join(INSTANT_ROOM);
      ack?.({ ok: true, room: INSTANT_ROOM });
    });

    // Technician accepts an instant job request
    socket.on('instant:accept_job', async ({ bookingId, serviceRequestId }, ack) => {
      try {
        if (socket.user.role !== ROLES.TECHNICIAN) {
          return ack?.({ ok: false, error: 'technician role required' });
        }

        const technician = await Technician.findOne({ user: socket.user.id });
        if (!technician) return ack?.({ ok: false, error: 'Technician profile not found' });

        const booking = await Booking.findById(bookingId);
        if (!booking) return ack?.({ ok: false, error: 'Booking not found' });

        if (booking.technician && String(booking.technician) !== String(technician._id)) {
          return ack?.({ ok: false, error: 'Job has already been accepted by another technician' });
        }

        booking.technician = technician._id;
        booking.instantStatus = 'ASSIGNED';
        await booking.save();

        let sr = await ServiceRequest.findById(serviceRequestId || booking.serviceRequest);
        if (sr) {
          sr.technician = technician._id;
          sr.instantStatus = 'ASSIGNED';
          await sr.save();
          sr = await transitionStatus(sr.id, 'Assigned', {
            description: `Instant booking accepted by ${technician.name}`,
          });
        }

        // Notify customer & admin tracking room
        io.emit('instant:status_update', {
          bookingId: booking.id,
          serviceRequestId: sr?.id,
          instantStatus: 'ASSIGNED',
          technician: {
            id: technician._id,
            name: technician.name,
            phone: technician.phone,
            rating: technician.rating,
          },
        });

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

        io.emit('instant:status_update', {
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
