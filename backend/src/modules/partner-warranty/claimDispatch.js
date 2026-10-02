import { WarrantyClaim } from './warrantyClaim.model.js';
import { appendEvent, saveClaim, emitClaimUpdated } from './claimTimeline.js';
import { CLAIM_STATUS, SERVICE_STAGES, visitLabel } from './claimStatus.js';
import { Job } from '../service-provider/job.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { claimLinks } from './claimLinks.js';
import { Brand } from '../super-admin/brand.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { emit as emitNotification, emitToAdmins } from '../notifications/notification.service.js';

// What the dispatch engine (service-requests/serviceRequest.service.js) tells
// a warranty claim about its Service Job — offered, declined, timed out,
// nobody left — and what a partner sees about a warranty job before and after
// accepting (docs/partner-warranty Phase 6).
//
// Deliberately imports nothing from serviceRequest.service.js, which calls in
// here: no import cycle.

const SYSTEM = { kind: 'system', name: 'NCC' };

async function claimFor(sr) {
  if (!sr?.warrantyClaim) return null;
  return WarrantyClaim.findById(sr.warrantyClaim._id || sr.warrantyClaim);
}

/**
 * A warranty job was offered to a partner. Records it in the claim's
 * internal dispatch history, clears an earlier "allocation failed" flag, and
 * flags `unauthorizedFallback` when the brand has no authorized partners yet
 * (ARCHITECTURE §6, decision D6).
 */
export async function onWarrantyJobOffered(sr, provider, { authorized = null, manual = false } = {}) {
  const claim = await claimFor(sr);
  if (!claim) return;

  const recovered = claim.flags.allocationFailed;
  claim.flags.allocationFailed = false;
  if (authorized === false && !manual) claim.flags.unauthorizedFallback = true;

  appendEvent(claim, {
    action: 'PARTNER_OFFERED',
    actor: SYSTEM,
    note: [
      `${manual ? 'Assigned by NCC' : 'Offered'} to ${provider.name}`,
      authorized === false && !manual ? 'brand has no authorized partners — skill-qualified partner used' : null,
      recovered ? 'after an earlier allocation failure' : null,
    ]
      .filter(Boolean)
      .join('; '),
    visibility: 'internal',
  });
  await saveClaim(claim);

  // The partner hears about it even with the app closed (client #16) — the
  // pop-up only reaches an open app.
  await notifyPartner(provider, 'warranty.job_offered_partner', claim, sr);
}

/**
 * Tells a partner about their warranty job (client #16). `provider` is a
 * ServiceProvider doc or id; `kind` picks the wording for a withdrawal. NCC's
 * own reason stays internal — the partner is only told what to do.
 */
export async function notifyPartner(provider, template, claim, sr, extra = {}) {
  if (!provider) return;
  const sp = provider.user ? provider : await ServiceProvider.findById(provider).select('user name').lean();
  if (!sp?.user) return;
  const brand = claim.brand?.name ? claim.brand : await Brand.findById(claim.brand).select('name').lean();
  await emitNotification(template, {
    user: sp.user,
    jobId: sr?.humanId || null,
    humanId: claim.humanId,
    brandName: brand?.name || 'Partner brand',
    productName: claim.productName,
    issueName: claim.issueName,
    area: [claim.address?.city, claim.address?.pincode].filter(Boolean).join(' '),
    ...extra,
  });
}

/** The offered partner said no, or let the offer time out. */
export async function onWarrantyJobDeclined(sr, providerName, reason) {
  const claim = await claimFor(sr);
  if (!claim) return;
  appendEvent(claim, {
    action: 'PARTNER_DECLINED',
    actor: SYSTEM,
    note: `${providerName || 'Partner'} ${reason === 'timeout' ? 'did not respond in time' : 'declined'}`,
    visibility: 'internal',
  });
  await saveClaim(claim);
}

/** Flags the claim for Super Admin — once; later retries that also fail stay quiet. */
export async function markAllocationFailed(claim, reason) {
  if (!claim || claim.flags.allocationFailed) return;
  claim.flags.allocationFailed = true;
  appendEvent(claim, { action: 'ALLOCATION_FAILED', actor: SYSTEM, note: reason, visibility: 'internal' });
  await saveClaim(claim);

  const [sr, brand] = await Promise.all([
    ServiceRequest.findById(claim.serviceRequest).select('humanId').lean(),
    Brand.findById(claim.brand).select('name').lean(),
  ]);
  await emitToAdmins('warranty.allocation_failed', {
    jobId: sr?.humanId,
    humanId: claim.humanId,
    brandName: brand?.name,
    productName: claim.productName,
    pincode: claim.address?.pincode,
    reason,
    cta: { label: 'Assign Partner', route: claimLinks.admin(claim.id) },
  });
}

export async function markAllocationFailedFor(sr, reason) {
  return markAllocationFailed(await claimFor(sr), reason);
}

/**
 * What a partner is shown about a warranty job (client #11): brand, product,
 * issue, area, both IDs, and that it is a warranty service. Nothing about
 * the brand's decision notes; the customer's documents, purchase date and
 * remarks only for the partner the job is assigned to (`forAssignedPartner`).
 */
export function warrantyJobInfo(claim, sr, { forAssignedPartner = false } = {}) {
  if (!claim) return null;
  const info = {
    isWarranty: true,
    serviceLabel: 'Warranty Service',
    jobId: sr?.humanId || null,
    claimId: claim.humanId,
    brand: claim.brand?.name || null,
    productName: claim.productName,
    issueName: claim.issueName,
    modelNumber: claim.modelNumber || null,
    serialNumber: claim.serialNumber || null,
    area: claim.address?.city || null,
    pincode: claim.address?.pincode || null,
    visit: claim.visit?.date ? { date: claim.visit.date, slot: claim.visit.slot || null } : null,
    // No money is collected from the customer for the covered issue; NCC pays
    // the partner (manual B2B2C settlement, Phase 11).
    customerPays: 0,
  };
  if (!forAssignedPartner) return info;
  // Once the job is theirs: where to go (client #11 "customer location" — the
  // offer shows only area + pincode), the customer's proof of purchase and
  // photos, and what they wrote — never the brand's internal notes.
  const a = claim.address || {};
  return {
    ...info,
    address: {
      name: a.name || null,
      house: a.house || null,
      landmark: a.landmark || null,
      city: a.city || null,
      state: a.state || null,
      pincode: a.pincode || null,
      latitude: a.latitude ?? null,
      longitude: a.longitude ?? null,
      line: [a.house, a.landmark, a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ` ${a.pincode}` : ''),
    },
    claimStatus: claim.status,
    purchaseDate: claim.purchaseDate || null,
    remarks: claim.remarks || null,
    documents: (claim.documents || []).map((d) => ({ kind: d.kind, url: d.url, name: d.name || null })),
  };
}

/**
 * Warranty info for many service requests at once — the offer feed, or (with
 * `forAssignedPartner`) the partner's own accepted jobs.
 */
export async function warrantyInfoBySr(srs, { forAssignedPartner = false } = {}) {
  const ids = srs.filter((sr) => sr.warrantyClaim).map((sr) => sr.warrantyClaim._id || sr.warrantyClaim);
  if (!ids.length) return new Map();
  const claims = await WarrantyClaim.find({ _id: { $in: ids } }).populate('brand', 'name');
  const byId = new Map(claims.map((c) => [String(c._id), c]));
  return new Map(
    srs
      .filter((sr) => sr.warrantyClaim)
      .map((sr) => [String(sr._id), warrantyJobInfo(byId.get(String(sr.warrantyClaim._id || sr.warrantyClaim)), sr, { forAssignedPartner })]),
  );
}

// ── Status sync: Service Job → claim (Phase 7, ARCHITECTURE §9) ─────────────

const JOB_STEPS_ON_THE_WAY = new Set(['ontheway', 'revisit_ontheway']);

/**
 * Where the claim should be, given the job. `null` = nothing to say (the job
 * hasn't been accepted, or is in a state that doesn't move the claim).
 */
export function claimStageForJob(srStatus, jobStep) {
  if (srStatus === 'Closed') return CLAIM_STATUS.CLOSED;
  if (['Repair Completed', 'Customer Confirmation'].includes(srStatus)) return CLAIM_STATUS.SERVICE_COMPLETED;
  if (JOB_STEPS_ON_THE_WAY.has(jobStep)) return CLAIM_STATUS.TECHNICIAN_ON_WAY;
  if (['Engineer Reached', 'Diagnosis Done', 'Spare Required', 'Spare Ordered', 'Spare Received'].includes(srStatus)) {
    return CLAIM_STATUS.SERVICE_IN_PROGRESS;
  }
  if (['Visit Scheduled', 'Reschedule'].includes(srStatus)) return CLAIM_STATUS.VISIT_SCHEDULED;
  if (srStatus === 'Engineer Accepted') return CLAIM_STATUS.PARTNER_ASSIGNED;
  return null;
}

const ACTION_FOR_STAGE = {
  [CLAIM_STATUS.PARTNER_ASSIGNED]: 'PARTNER_ASSIGNED',
  [CLAIM_STATUS.VISIT_SCHEDULED]: 'VISIT_SCHEDULED',
  [CLAIM_STATUS.TECHNICIAN_ON_WAY]: 'TECHNICIAN_ON_WAY',
  [CLAIM_STATUS.SERVICE_IN_PROGRESS]: 'JOB_STARTED',
  [CLAIM_STATUS.SERVICE_COMPLETED]: 'JOB_COMPLETED',
  [CLAIM_STATUS.CLOSED]: 'CLAIM_CLOSED',
};

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'Your technician';

/**
 * Moves the claim to match its Service Job — forward only, so a revisit or a
 * status that repeats never drags the claim back. A claim on hold, cancelled,
 * rejected or not yet at the service stages is left alone; so is anything the
 * sync can't map. Returns the new status, or null when nothing changed.
 */
export async function syncClaimFromJob(srOrId) {
  const sr = srOrId?.status ? srOrId : await ServiceRequest.findById(srOrId);
  if (!sr?.warrantyClaim) return null;
  const claim = await claimFor(sr);
  if (!claim) return null;
  // Held or finished claims don't follow the job; an admin decides.
  if ([CLAIM_STATUS.ON_HOLD, CLAIM_STATUS.CANCELLED, CLAIM_STATUS.CLOSED, CLAIM_STATUS.REJECTED].includes(claim.status)) return null;
  // A job the claim has moved on from (replaced by Super Admin) says nothing.
  if (claim.serviceRequest && String(claim.serviceRequest) !== String(sr._id)) return null;

  if (sr.status === 'Cancelled') {
    await markAllocationFailed(claim, `Service Job ${sr.humanId} was cancelled — the claim needs a new job or a decision`);
    return null;
  }

  const job = await Job.findOne({ serviceRequest: sr._id }).select('activeStep').lean();
  const target = claimStageForJob(sr.status, job?.activeStep);
  const from = SERVICE_STAGES.indexOf(claim.status);
  const to = SERVICE_STAGES.indexOf(target);
  if (target == null || from === -1 || to <= from) {
    // The job moved but the claim stays (e.g. the partner collected and the
    // job now waits on the customer's confirmation): still tell the open
    // screens to refetch — the customer's "confirm" button depends on it.
    if (from !== -1) emitClaimUpdated(claim, [{ visibility: 'customer' }]);
    return null;
  }

  const provider = sr.serviceProvider
    ? await ServiceProvider.findById(sr.serviceProvider._id || sr.serviceProvider).select('name').lean()
    : null;
  const note = {
    [CLAIM_STATUS.PARTNER_ASSIGNED]: `${firstName(provider?.name)} will handle your service`,
    [CLAIM_STATUS.TECHNICIAN_ON_WAY]: `${firstName(provider?.name)} is on the way`,
    [CLAIM_STATUS.VISIT_SCHEDULED]: claim.visit?.date ? `Visit on ${visitLabel(claim.visit.date, claim.visit.slot)}` : undefined,
  }[target];

  appendEvent(claim, {
    action: ACTION_FOR_STAGE[target],
    toStatus: target,
    actor: provider ? { kind: 'partner', user: null, name: provider.name } : SYSTEM,
    note,
    visibility: 'customer',
  });
  await saveClaim(claim);
  return target;
}
