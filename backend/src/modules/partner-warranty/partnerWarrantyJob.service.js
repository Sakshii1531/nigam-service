import { WarrantyClaim } from './warrantyClaim.model.js';
import { appendEvent, saveClaim } from './claimTimeline.js';
import { CLAIM_STATUS, visitLabel } from './claimStatus.js';
import { Job } from '../service-provider/job.model.js';
import { User } from '../auth/user.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { transitionStatus } from '../service-requests/serviceRequest.service.js';
import { SERVICE_REQUEST_TRANSITIONS } from '../../config/constants.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Actions around a warranty Service Job that aren't part of the generic job
// flow (docs/partner-warranty Phase 7): the partner fixing the visit slot, the
// customer confirming the work, and closing claims nobody confirmed.

const SYSTEM = { kind: 'system', name: 'NCC' };

/** Default wait before a completed-but-unconfirmed claim closes on its own. */
export const AUTO_CLOSE_AFTER_HOURS = 72;

function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * The partner sets (or moves) the visit: `date` YYYY-MM-DD, `slot` free text
 * ("10 AM – 12 PM"). The customer and brand see it on the claim. First time →
 * the job and claim move to Visit Scheduled; later → a reschedule event.
 */
export async function scheduleVisit(serviceProviderId, jobId, { date, slot }) {
  const job = await Job.findById(jobId).select('serviceRequest serviceProvider activeStep');
  if (!job || String(job.serviceProvider) !== String(serviceProviderId)) throw new ApiError(404, 'Job not found');
  const sr = await ServiceRequest.findById(job.serviceRequest);
  if (!sr?.warrantyClaim) throw new ApiError(400, 'Only warranty jobs are scheduled here');
  if (date < todayIso()) throw new ApiError(400, 'The visit date cannot be in the past');

  const claim = await WarrantyClaim.findById(sr.warrantyClaim);
  const schedulable = [CLAIM_STATUS.PARTNER_ASSIGNED, CLAIM_STATUS.VISIT_SCHEDULED, CLAIM_STATUS.TECHNICIAN_ON_WAY];
  if (!claim || !schedulable.includes(claim.status)) {
    throw new ApiError(409, 'The visit can only be scheduled before the service starts');
  }

  const rescheduling = Boolean(claim.visit?.date);
  claim.visit = { date, slot };
  if (rescheduling) {
    appendEvent(claim, { action: 'VISIT_SCHEDULED', actor: SYSTEM, note: `Visit moved to ${visitLabel(date, slot)}`, visibility: 'customer' });
  }
  await saveClaim(claim);

  // First scheduling moves the job forward; the status sync then moves the
  // claim to Visit Scheduled with the slot in its note.
  if (SERVICE_REQUEST_TRANSITIONS[sr.status]?.includes('Visit Scheduled') && sr.status === 'Engineer Accepted') {
    await transitionStatus(sr._id, 'Visit Scheduled', { description: `Visit scheduled for ${visitLabel(date, slot)}` });
  }
  return { visit: { date, slot }, claimStatus: (await WarrantyClaim.findById(claim._id).select('status').lean()).status };
}

/**
 * Closes the job and the claim together. `event` is the claim's closing event.
 * The job goes first (without its usual sync — this function closes the claim
 * with the right event), so the claim's CLAIM_CLOSED record already sees a
 * closed job.
 */
async function closeClaimAndJob(claim, event) {
  const sr = await ServiceRequest.findById(claim.serviceRequest).select('status');
  if (sr && SERVICE_REQUEST_TRANSITIONS[sr.status]?.includes('Closed')) {
    await transitionStatus(sr._id, 'Closed', { description: event.note, skipWarrantySync: true });
  }
  appendEvent(claim, { ...event, toStatus: CLAIM_STATUS.CLOSED, visibility: 'customer' });
  await saveClaim(claim);
  return claim;
}

/**
 * The customer confirms the work is done → job and claim Closed. Only once
 * the partner has finished (the job is waiting on Customer Confirmation), so
 * a confirmation can never cut a job short.
 */
export async function confirmService(customerId, claim) {
  if (claim.status !== CLAIM_STATUS.SERVICE_COMPLETED) {
    throw new ApiError(409, 'You can confirm once the technician has marked the service complete');
  }
  const sr = await ServiceRequest.findById(claim.serviceRequest).select('status');
  if (sr?.status !== 'Customer Confirmation') {
    throw new ApiError(409, 'The technician has not finished closing the job yet');
  }
  const user = await User.findById(customerId).select('name').lean();
  return closeClaimAndJob(claim, {
    action: 'CUSTOMER_CONFIRMED',
    actor: { kind: 'customer', user: customerId, name: user?.name },
    note: 'Customer confirmed the service',
  });
}

/**
 * Closes completed claims the customer never confirmed, once the job has been
 * waiting on Customer Confirmation for `olderThanHours`. Run periodically from
 * server.js; returns how many it closed.
 */
export async function autoCloseCompletedClaims({ olderThanHours = AUTO_CLOSE_AFTER_HOURS, now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - olderThanHours * 3600 * 1000);
  const waiting = await ServiceRequest.find({
    warrantyClaim: { $ne: null },
    status: 'Customer Confirmation',
    updatedAt: { $lt: cutoff },
  }).select('warrantyClaim');

  let closed = 0;
  for (const sr of waiting) {
    const claim = await WarrantyClaim.findById(sr.warrantyClaim);
    if (claim?.status !== CLAIM_STATUS.SERVICE_COMPLETED) continue;
    try {
      await closeClaimAndJob(claim, {
        action: 'CLAIM_CLOSED',
        actor: SYSTEM,
        note: `Closed automatically — not confirmed within ${olderThanHours} hours of completion`,
      });
      closed += 1;
    } catch (err) {
      console.warn('[partner-warranty] auto-close failed for', claim.humanId, err.message);
    }
  }
  return { checked: waiting.length, closed };
}
