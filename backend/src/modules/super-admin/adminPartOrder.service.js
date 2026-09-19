import { PartOrder } from '../service-provider/partOrder.model.js';
import { Job } from '../service-provider/job.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Booking } from '../booking/booking.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
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
export async function listPartOrders({ status, orderSource, fulfillmentType, page, limit, sort } = {}) {
  const query = {};
  if (status) query.status = status;
  if (orderSource) query.orderSource = orderSource;
  if (fulfillmentType) query.fulfillmentType = fulfillmentType;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    PartOrder.find(query)
      .populate('serviceProvider', 'name phone')
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
 * console's behaviour deliberately: a service provider should not get a different
 * outcome depending on which desk happened to action their request.
 */
export async function updatePartOrderStatus(partOrderId, { status, scheduledDate, timeSlot, notes } = {}) {
  const partOrder = await PartOrder.findById(partOrderId);
  if (!partOrder) throw new ApiError(404, 'Part request not found');

  // The customer has to sign off on this cost before it goes any further —
  // a technician used to be able to have a real-money part approved/dispatched
  // here with the customer only ever informed after the fact, never asked.
  // Rejecting is always allowed (that just ends the request either way).
  if (status !== 'Rejected' && partOrder.customerApprovalStatus !== 'Approved') {
    throw new ApiError(400, 'The customer has not approved this part request yet — nothing to action until they do.');
  }

  // A part already in NCC warehouse stock just needs pulling and handing
  // over — there's no shipping leg, so it never sees 'Dispatched'/'Delivered'.
  // A part that has to be procured never sees 'Ready to Hand Over'/'Handed
  // Over' either, since it does genuinely get shipped. Rejected is terminal
  // either way and always allowed.
  const STATUS_LADDERS = {
    in_stock: ['Pending', 'Approved', 'Ready to Hand Over', 'Handed Over'],
    procurement: ['Pending', 'Approved', 'Dispatched', 'Delivered'],
  };
  const ladder = STATUS_LADDERS[partOrder.fulfillmentType] || STATUS_LADDERS.procurement;
  if (status !== 'Rejected' && !ladder.includes(status)) {
    throw new ApiError(400, `'${status}' is not a valid status for a ${partOrder.fulfillmentType === 'in_stock' ? 'warehouse in-stock' : 'procurement'} part request.`);
  }

  partOrder.status = status;
  await partOrder.save();

  if (partOrder.job) {
    const job = await Job.findById(partOrder.job);
    const sr = job ? await ServiceRequest.findById(job.serviceRequest) : null;

    const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400000);
    // Approved/Dispatched/Delivered (procurement) and Approved/Ready to Hand
    // Over/Handed Over (in_stock) all put the revisit on the calendar — the
    // same steps brandInsights.service.js schedules on. Only the terminal
    // step used to do this here, so a service provider whose part was
    // actioned by the NCC desk rather than a brand was left sitting at
    // 'spareapproval' with no revisit at all: exactly the desk-dependent
    // difference the note above says must not happen.
    const REVISIT_STEP = partOrder.fulfillmentType === 'in_stock'
      ? {
          Approved: ['Spare Approved', 'Spare part approved by Super Admin — revisit scheduled'],
          'Ready to Hand Over': ['Spare Ready for Handover', 'Spare part ready to hand over — revisit scheduled'],
          'Handed Over': ['Spare Received', 'Spare part handed over to serviceProvider — revisit scheduled'],
        }
      : {
          Approved: ['Spare Approved', 'Spare part approved by Super Admin — revisit scheduled'],
          Dispatched: ['Spare Dispatched', 'Spare part dispatched to serviceProvider — revisit scheduled'],
          Delivered: ['Spare Received', 'Spare part delivered — revisit scheduled'],
        };

    // Normalise timeSlot: job.revisit.timeSlot is a plain String; booking.timeSlot
    // is { date, time }. Build both shapes once so each assignment is correct.
    const timeSlotStr = typeof timeSlot === 'object' && timeSlot !== null
      ? (timeSlot.time || '10:00 AM - 01:00 PM')
      : (timeSlot || '10:00 AM - 01:00 PM');
    const timeSlotObj = typeof timeSlot === 'object' && timeSlot !== null
      ? timeSlot
      : { date: parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), time: timeSlot || '10:00 AM - 01:00 PM' };

    if (REVISIT_STEP[status]) {
      const [stepLabel, defaultNote] = REVISIT_STEP[status];

      if (job) {
        job.activeStep = 'revisit_scheduled';
        job.revisit = {
          scheduledDate: parsedDate,
          expectedDate: parsedDate,
          timeSlot: timeSlotStr,   // revisitSchema defines timeSlot as String
          status: 'Scheduled',
          partOrderId: partOrder._id,
          notes: notes || defaultNote,
        };
        await job.save();
      }

      if (sr) {
        sr.status = 'Spare Received';
        // One entry per desk action, deduped by label: submitSpareParts may
        // already have walked the request to 'Spare Received', and an approve
        // followed by a dispatch should read as two steps rather than two
        // copies of the same one.
        if (!sr.timeline.some((t) => t.stepLabel === stepLabel)) {
          sr.timeline.push({ stepLabel, done: true, timestamp: new Date(), description: notes || defaultNote });
        }
        await sr.save();
      }
    }

    // Only the terminal step of each ladder — actual delivery for a procured
    // part, actual hand-over for one that was already in stock — re-dates the
    // customer's booking and tells them. Firing that on approve/dispatch as
    // well would notify them twice for one revisit.
    const isTerminalHandover = status === 'Delivered' || status === 'Handed Over';
    if (isTerminalHandover) {
      if (sr) {

        let customerUserId = null;
        if (sr.booking) {
          const booking = await Booking.findById(sr.booking);
          if (booking) {
            customerUserId = booking.user;
            booking.status = 'Upcoming';
            booking.instantStatus = 'RESCHEDULED';
            booking.scheduledDate = parsedDate;
            booking.timeSlot = timeSlotObj;  // bookingSchema defines timeSlot as { date, time }
            await booking.save();
          }
        } else if (sr.user) {
          customerUserId = sr.user;
        }

        const provider = job ? await ServiceProvider.findById(job.serviceProvider) : null;
        const formattedDate = parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        if (customerUserId) {
          await emitNotification('service.rescheduled', {
            user: customerUserId,
            category: sr.category,
            serviceProviderName: provider?.name || 'Your serviceProvider',
            scheduledDate: formattedDate,
            timeSlot: timeSlotStr,
            bookingId: sr.booking ? String(sr.booking) : null,
          }).catch(() => {});

          try {
            const io = getIO();
            io.to(`user:${customerUserId}`).emit('booking:updated', {
              bookingId: sr.booking,
              status: 'Upcoming',
              instantStatus: 'RESCHEDULED',
              scheduledDate: parsedDate,
              timeSlot: timeSlotStr,
            });
            io.to(`user:${customerUserId}`).emit('instant:status_update', {
              bookingId: sr.booking,
              instantStatus: 'RESCHEDULED',
            });
            io.to(`user:${customerUserId}`).emit('service_request:updated', {
              serviceRequestId: sr._id,
              status: 'Spare Received',
            });
          } catch (_err) {
            // Non-critical socket emission failure
          }
        }

        if (provider?.user) {
          try {
            const io = getIO();
            io.to(`user:${provider.user}`).emit('job:updated', {
              jobId: job?._id,
              activeStep: 'revisit_scheduled',
              revisit: job?.revisit,
            });
          } catch (_err) {
            // Non-critical socket emission failure
          }
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
    .populate('serviceProvider', 'name phone')
    .populate({ path: 'job', select: 'serviceRequest', populate: { path: 'serviceRequest', select: 'humanId category' } });
}
