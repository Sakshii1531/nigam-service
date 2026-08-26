import { PartOrder } from '../technician/partOrder.model.js';
import { Job } from '../technician/job.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Booking } from '../booking/booking.model.js';
import { Technician } from '../technician/technician.model.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { getIO } from '../../sockets/io.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

/**
 * Platform-wide spare part requests.
 *
 * The brand console only ever sees orders raised against its own brand's jobs
 * (PartOrder -> Job -> ServiceRequest.brand). That leaves the majority with
 * nowhere to go: a D2C paid job has no brand at all, and an 'NCC Warehouse'
 * order is NCC's to fulfil rather than any brand's. Those requests used to be
 * written to the database and then seen by nobody. This is the queue that owns
 * them.
 */
export async function listPartOrders({ status, orderSource, page, limit, sort } = {}) {
  const query = {};
  if (status) query.status = status;
  if (orderSource) query.orderSource = orderSource;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    PartOrder.find(query)
      .populate('technician', 'name phone')
      .populate({
        path: 'job',
        select: 'serviceRequest type',
        populate: { path: 'serviceRequest', select: 'humanId category brand status', populate: { path: 'brand', select: 'name' } },
      })
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    PartOrder.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * Approve/dispatch/reject a request, and — for an approval on a job that is
 * waiting on the part — put the revisit back on the calendar. Mirrors the brand
 * console's behaviour deliberately: a technician should not get a different
 * outcome depending on which desk happened to action their request.
 */
export async function updatePartOrderStatus(partOrderId, { status, scheduledDate, timeSlot, notes } = {}) {
  const partOrder = await PartOrder.findById(partOrderId);
  if (!partOrder) throw new ApiError(404, 'Part request not found');

  partOrder.status = status;
  await partOrder.save();

  if (partOrder.job) {
    const job = await Job.findById(partOrder.job);
    const sr = job ? await ServiceRequest.findById(job.serviceRequest) : null;

    if (status === 'Approved') {
      if (job) {
        if (!job.revisit) job.revisit = {};
        job.revisit.status = 'Pending Approval';
        job.revisit.partOrderId = partOrder._id;
        await job.save();
      }
      if (sr) {
        sr.timeline.push({
          stepLabel: 'Spare Approved',
          done: true,
          timestamp: new Date(),
          description: notes || 'Spare part approved by Super Admin — awaiting dispatch',
        });
        await sr.save();
      }
    } else if (status === 'Dispatched') {
      if (job) {
        if (!job.revisit) job.revisit = {};
        job.revisit.status = 'Pending Approval';
        job.revisit.partOrderId = partOrder._id;
        await job.save();
      }
      if (sr) {
        sr.timeline.push({
          stepLabel: 'Spare Dispatched',
          done: true,
          timestamp: new Date(),
          description: notes || 'Spare part dispatched to technician',
        });
        await sr.save();
      }
    } else if (status === 'Delivered') {
      const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400000);
      if (job) {
        job.activeStep = 'revisit_scheduled';
        job.revisit = {
          scheduledDate: parsedDate,
          expectedDate: parsedDate,
          timeSlot: timeSlot || '10:00 AM - 01:00 PM',
          status: 'Scheduled',
          partOrderId: partOrder._id,
          notes: notes || 'Spare part delivered — revisit scheduled',
        };
        await job.save();
      }

      if (sr) {
        const alreadyReceived = sr.status === 'Spare Received';
        sr.status = 'Spare Received';
        if (!alreadyReceived) {
          sr.timeline.push({
            stepLabel: 'Spare Received',
            done: true,
            timestamp: new Date(),
            description: notes || 'Spare part delivered — revisit scheduled',
          });
        }
        await sr.save();

        let customerUserId = null;
        if (sr.booking) {
          const booking = await Booking.findById(sr.booking);
          if (booking) {
            customerUserId = booking.user;
            booking.status = 'Upcoming';
            booking.instantStatus = 'RESCHEDULED';
            booking.scheduledDate = parsedDate;
            booking.timeSlot = timeSlot || '10:00 AM - 01:00 PM';
            await booking.save();
          }
        } else if (sr.user) {
          customerUserId = sr.user;
        }

        const tech = job ? await Technician.findById(job.technician) : null;
        const formattedDate = parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        if (customerUserId) {
          await emitNotification('service.rescheduled', {
            user: customerUserId,
            category: sr.category,
            technicianName: tech?.name || 'Your technician',
            scheduledDate: formattedDate,
            timeSlot: timeSlot || '10:00 AM - 01:00 PM',
            bookingId: sr.booking ? String(sr.booking) : null,
          }).catch(() => {});

          try {
            const io = getIO();
            io.to(`user:${customerUserId}`).emit('booking:updated', {
              bookingId: sr.booking,
              status: 'Upcoming',
              instantStatus: 'RESCHEDULED',
              scheduledDate: parsedDate,
              timeSlot: timeSlot || '10:00 AM - 01:00 PM',
            });
            io.to(`user:${customerUserId}`).emit('instant:status_update', {
              bookingId: sr.booking,
              instantStatus: 'RESCHEDULED',
            });
            io.to(`user:${customerUserId}`).emit('service_request:updated', {
              serviceRequestId: sr._id,
              status: 'Spare Received',
            });
          } catch {}
        }

        if (tech?.user) {
          try {
            const io = getIO();
            io.to(`user:${tech.user}`).emit('job:updated', {
              jobId: job?._id,
              activeStep: 'revisit_scheduled',
              revisit: job?.revisit,
            });
          } catch {}
        }
      }
    } else if (status === 'Rejected') {
      if (sr) {
        sr.timeline.push({
          stepLabel: 'Spare Rejected',
          done: true,
          timestamp: new Date(),
          description: notes || 'Spare part request rejected by Super Admin',
        });
        await sr.save();
      }
    }
  }

  return PartOrder.findById(partOrderId)
    .populate('technician', 'name phone')
    .populate({ path: 'job', select: 'serviceRequest', populate: { path: 'serviceRequest', select: 'humanId category' } });
}
