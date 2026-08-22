import { PartOrder } from '../technician/partOrder.model.js';
import { Job } from '../technician/job.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
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

  if (partOrder.job && (status === 'Approved' || status === 'Dispatched')) {
    const job = await Job.findById(partOrder.job);
    if (job) {
      const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400000);
      job.activeStep = 'revisit_scheduled';
      job.revisit = {
        scheduledDate: parsedDate,
        expectedDate: parsedDate,
        timeSlot: timeSlot || '10:00 AM - 01:00 PM',
        status: 'Scheduled',
        partOrderId: partOrder._id,
        notes: notes || 'Spare part approved by NCC',
      };
      await job.save();

      const sr = await ServiceRequest.findById(job.serviceRequest);
      if (sr) {
        // Same guard as the brand path: submitSpareParts may already have
        // reached 'Spare Received', and re-stamping duplicates the entry.
        const alreadyReceived = sr.status === 'Spare Received';
        sr.status = 'Spare Received';
        if (!alreadyReceived) sr.timeline.push({
          stepLabel: 'Spare Received',
          done: true,
          timestamp: new Date(),
          description: `Spare part ${status.toLowerCase()} by NCC — revisit scheduled`,
        });
        await sr.save();
      }
    }
  }

  return PartOrder.findById(partOrderId)
    .populate('technician', 'name phone')
    .populate({ path: 'job', select: 'serviceRequest', populate: { path: 'serviceRequest', select: 'humanId category' } });
}
