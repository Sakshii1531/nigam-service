import { WarrantyClaim } from './warrantyClaim.model.js';
import { appendEvent, persistClaim, flushAudit } from './claimTimeline.js';
import { markAllocationFailed } from './claimDispatch.js';
import { CLAIM_STATUS } from './claimStatus.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { createServiceRequest, assignServiceProvider } from '../service-requests/serviceRequest.service.js';
import { generateHumanId } from '../shared/idGenerator.js';
import { ID_PREFIXES } from '../../config/constants.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { runInTransaction } from '../../utils/transaction.js';

// The bridge from a brand-approved warranty claim to NCC's service network
// (docs/partner-warranty Phase 5, ARCHITECTURE §5). The claim and its Service
// Job are separate documents: the claim is the customer's and brand's record
// (NCCW), the job is the network's execution record — a ServiceRequest with an
// NCCJ humanId, dispatched and worked exactly like every other request.

const SYSTEM = { kind: 'system', name: 'NCC' };

/**
 * Creates the Service Job for an approved claim. Idempotent: a claim that
 * already has one gets it back rather than a second job. Pass `session` to
 * write inside the caller's transaction.
 */
export async function createServiceJobForClaim(claim, { session } = {}) {
  // Looked up by the claim too, not just claim.serviceRequest: on a
  // deployment without transactions a crash between creating the job and
  // linking it would otherwise produce a second job on retry. Only an
  // *active* job is reused — after a replacement or a reopen (Phase 8) the
  // claim's old job is Cancelled/Closed and a new one is wanted.
  const existing = await ServiceRequest.findOne({ warrantyClaim: claim._id, status: { $nin: ['Cancelled', 'Closed'] } }).session(session || null);
  if (existing) return existing;

  const { address } = claim;
  const issueLine = `Warranty: ${claim.productName} — ${claim.issueName}`;
  return createServiceRequest(
    {
      // Set here rather than by the model's SR-#### plugin: warranty jobs
      // carry their own yearly NCCJ series.
      humanId: await generateHumanId(ID_PREFIXES.SERVICE_JOB),
      user: claim.customer._id || claim.customer,
      brand: claim.brand._id || claim.brand,
      warrantyClaim: claim._id,
      requestMode: 'B2B2C',
      warranty: 'In Warranty',
      category: claim.categoryKey,
      model: claim.modelNumber,
      serialNo: claim.serialNumber,
      description: claim.remarks ? `${issueLine}. ${claim.remarks}` : issueLine,
      invoiceAvailable: (claim.documents || []).some((d) => d.kind === 'invoice'),
      attachments: (claim.documents || []).map((d) => d.url),
      zone: address?.city || undefined,
      pincode: address?.pincode || null,
      customerLocation:
        address?.latitude != null && address?.longitude != null
          ? { latitude: address.latitude, longitude: address.longitude }
          : undefined,
      slaDueAt: claim.sla?.resolutionDueAt || undefined,
    },
    // No generic "brand warranty claim" alert — the brand just approved this one.
    { session, notifyBrand: false },
  );
}

/**
 * Approves a claim and creates its Service Job as one unit: both or neither.
 * `decide(claim)` applies the approval event to the freshly loaded claim (so a
 * transaction retry never double-appends). Returns the claim id.
 *
 * Runs dispatch after the commit — a notification or a partner offer must
 * never go out for a job that then rolls back.
 */
export async function approveAndCreateJob(filter, decide) {
  let claim;
  await runInTransaction(async (session) => {
    claim = await WarrantyClaim.findOne(filter).session(session || null);
    if (!claim) throw new ApiError(404, 'Warranty claim not found');
    decide(claim);
    // Saved before the job exists: of two simultaneous approvals the loser
    // fails here (version conflict → 409) and never creates a job.
    await persistClaim(claim, { session });

    const sr = await createServiceJobForClaim(claim, { session });
    claim.serviceRequest = sr._id;
    appendEvent(claim, {
      action: 'JOB_CREATED',
      toStatus: CLAIM_STATUS.JOB_CREATED,
      actor: SYSTEM,
      note: `Service Job ${sr.humanId}`,
      visibility: 'customer',
    });
    await persistClaim(claim, { session });
  });
  await flushAudit(claim);
  await dispatchServiceJob(claim._id);
  return claim._id;
}

/**
 * Offers the claim's Service Job to the best eligible partner (the existing
 * dispatch engine: offer → accept / decline / timeout → next). Nobody
 * eligible is an expected outcome, not an error: the claim is flagged for
 * Super Admin, who assigns manually (Phase 8) or waits for the automatic
 * retry when a partner comes online.
 */
export async function dispatchServiceJob(claimId) {
  const claim = await WarrantyClaim.findById(claimId);
  if (!claim?.serviceRequest) return { assigned: false, reason: 'No service job' };
  try {
    const sr = await assignServiceProvider(String(claim.serviceRequest), null);
    return { assigned: true, serviceProvider: sr.serviceProvider?._id || sr.serviceProvider };
  } catch (err) {
    const reason = err.statusCode === 409 ? 'No eligible service partner available' : `Dispatch failed: ${err.message}`;
    await markAllocationFailed(claim, reason);
    return { assigned: false, reason };
  }
}
