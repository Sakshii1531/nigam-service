import mongoose from 'mongoose';
import { WarrantyClaim } from './warrantyClaim.model.js';
import { appendEvent, saveClaim } from './claimTimeline.js';
import { CLAIM_STATUS, CLAIM_STATUSES, SERVICE_STAGES, canTransition, customerStatusLabel } from './claimStatus.js';
import { claimLinks } from './claimLinks.js';
import { approveAndCreateJob, createServiceJobForClaim, dispatchServiceJob } from './claimJob.service.js';
import { syncClaimFromJob } from './claimDispatch.js';
import { User } from '../auth/user.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { AuditLog } from '../super-admin/auditLog.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { Job } from '../service-provider/job.model.js';
import { assignServiceProvider, suggestServiceProviders, transitionStatus } from '../service-requests/serviceRequest.service.js';
import { escapeRegex } from '../shared/brandWarranty.js';
import { emit as emitNotification, emitToBrand } from '../notifications/notification.service.js';
import { SERVICE_REQUEST_TRANSITIONS } from '../../config/constants.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Super Admin: every brand's claims, and every manual control the client
// listed (#14) — docs/partner-warranty Phase 8. Every override takes a
// reason and lands in the claim timeline + AuditLog as actor `admin`.

const S = CLAIM_STATUS;
const DECIDABLE = [S.SUBMITTED, S.BRAND_REVIEW, S.INFO_REQUESTED];
const TERMINAL_JOB = ['Cancelled', 'Closed'];

// ── Views ────────────────────────────────────────────────────────────────────

function partnerSummary(sp) {
  return sp && sp._id ? { id: String(sp._id), name: sp.name, phone: sp.phone || null } : null;
}

function slaState(claim) {
  return claim.sla?.state || 'ok';
}

function toAdminSummary(claim) {
  const sr = claim.serviceRequest && claim.serviceRequest._id ? claim.serviceRequest : null;
  return {
    id: String(claim._id),
    humanId: claim.humanId,
    status: claim.status,
    brand: claim.brand?._id ? { id: String(claim.brand._id), name: claim.brand.name } : null,
    customer: claim.customer?._id ? { id: String(claim.customer._id), name: claim.customer.name, phone: claim.customer.phone || null } : null,
    productName: claim.productName,
    categoryKey: claim.categoryKey,
    issueName: claim.issueName,
    location: { city: claim.address?.city || null, pincode: claim.address?.pincode || null },
    serviceJob: sr ? { id: String(sr._id), humanId: sr.humanId, status: sr.status } : null,
    assignedPartner: partnerSummary(sr?.serviceProvider),
    flags: {
      escalated: Boolean(claim.flags?.escalated),
      allocationFailed: Boolean(claim.flags?.allocationFailed),
      unauthorizedFallback: Boolean(claim.flags?.unauthorizedFallback),
    },
    slaState: slaState(claim),
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

const POPULATE_SUMMARY = [
  { path: 'brand', select: 'name' },
  { path: 'customer', select: 'name phone' },
  { path: 'serviceRequest', select: 'humanId status serviceProvider', populate: { path: 'serviceProvider', select: 'name phone' } },
];

async function loadClaim(idOrHumanId) {
  const key = mongoose.isValidObjectId(idOrHumanId) ? { _id: idOrHumanId } : { humanId: String(idOrHumanId).toUpperCase() };
  const claim = await WarrantyClaim.findOne(key);
  if (!claim) throw new ApiError(404, 'Warranty claim not found');
  return claim;
}

// ── List ─────────────────────────────────────────────────────────────────────

/**
 * All brands' claims. Filters (client #3): brand, category, product type,
 * status (comma list), date range, city, pincode; plus escalated,
 * allocationFailed, slaState, and `q` over ticket, Service Job ID, serial,
 * model and customer name/phone.
 */
export async function listClaims(filters = {}) {
  const { brand, category, productType, status, from, to, city, pincode, escalated, allocationFailed, slaState: sla, q, page, limit, sort } = filters;
  const query = {};
  if (brand) query.brand = brand;
  if (category) query.categoryKey = category;
  if (productType) query.productType = productType;
  if (status) query.status = { $in: String(status).split(',').map((s) => s.trim()).filter((s) => CLAIM_STATUSES.includes(s)) };
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  if (city) query['address.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (pincode) query['address.pincode'] = pincode;
  if (escalated !== undefined) query['flags.escalated'] = escalated;
  if (allocationFailed !== undefined) query['flags.allocationFailed'] = allocationFailed;
  if (sla === 'ok') query['sla.state'] = { $nin: ['warning', 'breached'] };
  else if (sla) query['sla.state'] = sla;

  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    const [customers, jobs] = await Promise.all([
      User.find({ role: 'customer', $or: [{ phone: rx }, { name: rx }] }).select('_id').limit(200).lean(),
      ServiceRequest.find({ humanId: rx, warrantyClaim: { $ne: null } }).select('warrantyClaim').limit(200).lean(),
    ]);
    query.$or = [
      { humanId: rx },
      { serialNumber: rx },
      { modelNumber: rx },
      { customer: { $in: customers.map((c) => c._id) } },
      { _id: { $in: jobs.map((j) => j.warrantyClaim) } },
    ];
  }

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total, countRows] = await Promise.all([
    WarrantyClaim.find(query).populate(POPULATE_SUMMARY).sort(sortObj).skip(skip).limit(lim),
    WarrantyClaim.countDocuments(query),
    WarrantyClaim.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  return {
    items: items.map(toAdminSummary),
    meta: { ...paginationMeta({ page: pg, limit: lim, total }), counts: Object.fromEntries(countRows.map((r) => [r._id, r.count])) },
  };
}

// ── Detail ───────────────────────────────────────────────────────────────────

/** Everything, internal events and dispatch history included. */
export async function getClaim(id) {
  const claim = await (await loadClaim(id)).populate(POPULATE_SUMMARY);
  const [audit, jobs] = await Promise.all([
    AuditLog.find({ entityType: 'WarrantyClaim', entityId: claim._id }).populate('user', 'name role').sort({ createdAt: 1, _id: 1 }).lean(),
    // Every Service Job this claim has had — more than one after a replacement or reopen.
    ServiceRequest.find({ warrantyClaim: claim._id })
      .select('humanId status serviceProvider declinedBy assignedAt isAccepted createdAt cancellationReason')
      .populate('serviceProvider', 'name phone')
      .populate('declinedBy', 'name')
      .sort({ createdAt: 1 })
      .lean(),
  ]);
  const jobDocs = await Job.find({ serviceRequest: { $in: jobs.map((j) => j._id) } }).select('serviceRequest activeStep payout type').lean();
  const jobBySr = new Map(jobDocs.map((j) => [String(j.serviceRequest), j]));

  return {
    ...toAdminSummary(claim),
    customerStatusLabel: customerStatusLabel(claim.status),
    statusBeforeHold: claim.statusBeforeHold,
    modelNumber: claim.modelNumber,
    serialNumber: claim.serialNumber,
    purchaseDate: claim.purchaseDate,
    remarks: claim.remarks || null,
    warrantyCheck: claim.warrantyCheck,
    address: claim.address,
    documents: claim.documents.map((d) => ({ id: String(d._id), kind: d.kind, url: d.url, name: d.name || null, uploadedAt: d.uploadedAt })),
    infoRequests: claim.infoRequests.map((r) => ({ id: String(r._id), message: r.message, requestedAt: r.requestedAt, response: r.response || null, respondedAt: r.respondedAt || null })),
    rejectionReason: claim.rejectionReason,
    visit: claim.visit?.date ? claim.visit : null,
    flags: claim.flags,
    sla: claim.sla,
    serviceJobs: jobs.map((j) => {
      const job = jobBySr.get(String(j._id));
      return {
        id: String(j._id),
        humanId: j.humanId,
        status: j.status,
        current: String(j._id) === String(claim.serviceRequest?._id || claim.serviceRequest),
        partner: partnerSummary(j.serviceProvider),
        accepted: Boolean(j.isAccepted),
        assignedAt: j.assignedAt || null,
        declinedBy: (j.declinedBy || []).map((p) => p.name),
        cancellationReason: j.cancellationReason || null,
        jobStep: job?.activeStep || null,
        payout: job?.payout?.total ?? null,
      };
    }),
    timeline: claim.timeline.map((e) => ({
      id: String(e._id),
      at: e.at,
      action: e.action,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      by: { kind: e.actor.kind, name: e.actor.name || null },
      note: e.note || null,
      visibility: e.visibility,
    })),
    audit: audit.map((a) => ({
      at: a.createdAt,
      by: a.user ? { name: a.user.name, role: a.user.role } : null,
      action: a.action,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      reason: a.reason,
    })),
  };
}

export async function partnerSuggestions(id) {
  const claim = await loadClaim(id);
  if (!claim.serviceRequest) throw new ApiError(409, 'This claim has no Service Job yet');
  return suggestServiceProviders(String(claim.serviceRequest));
}

// ── Helpers for overrides ────────────────────────────────────────────────────

async function adminActor(user) {
  const u = await User.findById(user.id).select('name').lean();
  return { kind: 'admin', user: user.id, name: u?.name || 'NCC Admin' };
}

async function notifyCustomer(claim, template, payload = {}) {
  await emitNotification(template, { user: claim.customer, humanId: claim.humanId, cta: { label: 'View Claim', route: claimLinks.customer(claim.id) }, ...payload });
}

async function notifyBrand(claim, template, payload = {}) {
  await emitToBrand(template, claim.brand, { humanId: claim.humanId, cta: { label: 'View Claim', route: claimLinks.brand(claim.id) }, ...payload });
}

async function brandNameOf(claim) {
  return (await Brand.findById(claim.brand).select('name').lean())?.name || 'The brand';
}

/** The claim's current Service Job, if it still has a live one. */
async function activeJobOf(claim) {
  if (!claim.serviceRequest) return null;
  const sr = await ServiceRequest.findById(claim.serviceRequest);
  return sr && !TERMINAL_JOB.includes(sr.status) ? sr : null;
}

/**
 * Takes a Service Job out of service without going through the partner flow:
 * the SR is Cancelled and an accepted Job is stopped. Written directly (not via
 * transitionStatus), so the claim's status sync never reacts to it.
 */
async function retireJob(sr, reason) {
  const job = await Job.findOne({ serviceRequest: sr._id });
  if (job && !['completed', 'cancelled'].includes(job.activeStep)) {
    await Job.updateOne({ _id: job._id }, { activeStep: 'cancelled' });
    await ServiceProvider.updateOne({ _id: job.serviceProvider, activeJobsCount: { $gt: 0 } }, { $inc: { activeJobsCount: -1 } });
  }
  await ServiceRequest.updateOne(
    { _id: sr._id },
    {
      status: 'Cancelled',
      cancellationReason: reason,
      cancelledAt: new Date(),
      $push: { timeline: { stepLabel: 'Cancelled', done: true, timestamp: new Date(), description: `Cancelled by NCC: ${reason}` } },
    },
  );
}

/** A new Service Job for the claim (after a replacement or a reopen), then dispatch. */
async function startNewJob(claim, { serviceProviderId } = {}) {
  const sr = await createServiceJobForClaim(claim);
  claim.serviceRequest = sr._id;
  await saveClaim(claim);
  if (serviceProviderId) await assignServiceProvider(String(sr._id), serviceProviderId);
  else await dispatchServiceJob(claim._id);
  return sr;
}

// ── Overrides ────────────────────────────────────────────────────────────────

/** Approve on the brand's behalf (e.g. brand unresponsive past its SLA). */
export async function approveOnBehalf(user, id, { reason }) {
  const found = await loadClaim(id);
  if (!DECIDABLE.includes(found.status)) throw new ApiError(409, `This claim is already ${found.status.toLowerCase()}`);
  const actor = await adminActor(user);
  await approveAndCreateJob({ _id: found._id, __v: found.__v }, (claim) => {
    // The customer sees an ordinary approval; why NCC stepped in stays internal.
    appendEvent(claim, { action: 'CLAIM_APPROVED', toStatus: S.APPROVED, actor, visibility: 'customer' });
    appendEvent(claim, { action: 'NOTE_ADDED', actor, note: `Approved by NCC on the brand's behalf: ${reason}`, visibility: 'brand' });
  }).catch((err) => {
    if (err.statusCode === 404) throw new ApiError(409, 'This claim was just updated by someone else — reload and try again');
    throw err;
  });
  const claim = await loadClaim(found._id);
  const brandName = await brandNameOf(claim);
  await notifyCustomer(claim, 'warranty.claim_approved', { brandName });
  return getClaim(claim._id);
}

export async function rejectOnBehalf(user, id, { reason }) {
  const claim = await loadClaim(id);
  if (!DECIDABLE.includes(claim.status)) throw new ApiError(409, `This claim is already ${claim.status.toLowerCase()}`);
  claim.rejectionReason = reason;
  appendEvent(claim, { action: 'CLAIM_REJECTED', toStatus: S.REJECTED, actor: await adminActor(user), note: reason, visibility: 'customer' });
  await saveClaim(claim);
  await notifyCustomer(claim, 'warranty.claim_rejected', { brandName: await brandNameOf(claim), reason });
  return getClaim(claim._id);
}

/**
 * Manual assignment when automatic allocation failed (or to override it).
 * Only before a partner has accepted — after that it is a reassignment.
 */
export async function assignPartner(user, id, { serviceProviderId, reason }) {
  const claim = await loadClaim(id);
  if ([S.ON_HOLD, S.CANCELLED, S.CLOSED, S.REJECTED].includes(claim.status)) {
    throw new ApiError(409, `This claim is ${claim.status.toLowerCase()} — resume or reopen it first`);
  }
  if (!SERVICE_STAGES.includes(claim.status) && claim.status !== S.APPROVED) {
    throw new ApiError(409, 'The brand has not approved this claim yet');
  }
  const provider = await ServiceProvider.findById(serviceProviderId).select('name status').lean();
  if (!provider) throw new ApiError(404, 'Service partner not found');

  const sr = await activeJobOf(claim);
  if (sr && (await Job.exists({ serviceRequest: sr._id }))) {
    throw new ApiError(409, 'A partner has already accepted this job — use reassign');
  }

  appendEvent(claim, { action: 'MANUAL_ASSIGNMENT', actor: await adminActor(user), note: `${provider.name}: ${reason}`, visibility: 'internal' });
  if (sr) {
    await saveClaim(claim);
    await assignServiceProvider(String(sr._id), serviceProviderId);
  } else {
    // No live job (e.g. stuck at Approved after a crash, or its job was
    // cancelled): make one. A claim still at Approved moves to Job Created.
    if (claim.status === S.APPROVED) appendEvent(claim, { action: 'JOB_CREATED', toStatus: S.JOB_CREATED, actor: { kind: 'system', name: 'NCC' }, visibility: 'customer' });
    await startNewJob(claim, { serviceProviderId });
  }
  return getClaim(claim._id);
}

/**
 * Takes the job away from the current partner. Before acceptance the same job
 * is offered to `serviceProviderId` (or the next eligible partner). After
 * acceptance it needs `force`: that job is cancelled and the claim gets a new
 * Service Job, so both histories stay intact.
 */
export async function reassignPartner(user, id, { serviceProviderId, reason, force = false }) {
  const claim = await loadClaim(id);
  if (!SERVICE_STAGES.slice(0, -2).includes(claim.status)) {
    throw new ApiError(409, `A claim that is ${claim.status.toLowerCase()} can't be reassigned`);
  }
  const sr = await activeJobOf(claim);
  if (!sr) throw new ApiError(409, 'This claim has no live Service Job — use assign');
  const actor = await adminActor(user);
  const accepted = await Job.exists({ serviceRequest: sr._id });

  if (!accepted) {
    const previous = sr.serviceProvider;
    appendEvent(claim, { action: 'REASSIGNED', actor, note: reason, visibility: 'internal' });
    await saveClaim(claim);
    if (serviceProviderId) {
      await assignServiceProvider(String(sr._id), serviceProviderId);
    } else {
      await ServiceRequest.updateOne(
        { _id: sr._id },
        { serviceProvider: null, status: 'New', isAccepted: false, ...(previous ? { $addToSet: { declinedBy: previous } } : {}) },
      );
      await dispatchServiceJob(claim._id);
    }
    return getClaim(claim._id);
  }

  if (!force) throw new ApiError(409, 'The partner has already accepted this job — pass force: true to replace the job');
  await retireJob(sr, `Replaced: ${reason}`);
  claim.visit = undefined;
  appendEvent(claim, { action: 'REASSIGNED', toStatus: S.JOB_CREATED, actor, note: 'We are arranging a new service partner for you', visibility: 'customer' });
  appendEvent(claim, { action: 'NOTE_ADDED', actor, note: `Replaced Service Job ${sr.humanId}: ${reason}`, visibility: 'internal' });
  claim.serviceRequest = null;
  await startNewJob(claim, { serviceProviderId });
  return getClaim(claim._id);
}

// Where an admin may move a claim by hand. Approval, rejection, hold, cancel
// and reopen have their own endpoints because they do more than set a status.
const OVERRIDE_TARGETS = [S.BRAND_REVIEW, ...SERVICE_STAGES.slice(1)];

export async function changeStatus(user, id, { status, reason }) {
  const claim = await loadClaim(id);
  if (!OVERRIDE_TARGETS.includes(status)) {
    throw new ApiError(400, `Use the dedicated action for "${status}"`);
  }
  if (!canTransition(claim.status, status)) {
    throw new ApiError(400, `Cannot move claim from "${claim.status}" to "${status}"`);
  }
  // Closing by hand also closes the job when it is ready to close — job first,
  // so the claim's CLAIM_CLOSED event already sees it closed.
  if (status === S.CLOSED) {
    const sr = await activeJobOf(claim);
    if (sr && SERVICE_REQUEST_TRANSITIONS[sr.status]?.includes('Closed')) {
      await transitionStatus(sr._id, 'Closed', { description: `Closed by NCC: ${reason}`, skipWarrantySync: true });
    }
  }
  appendEvent(claim, { action: 'STATUS_OVERRIDDEN', toStatus: status, actor: await adminActor(user), note: reason, visibility: 'brand' });
  await saveClaim(claim);
  return getClaim(claim._id);
}

export async function escalate(user, id, { reason }) {
  const claim = await loadClaim(id);
  if (claim.flags.escalated) throw new ApiError(409, 'Already escalated');
  claim.flags.escalated = true;
  claim.flags.escalatedAt = new Date();
  claim.flags.escalationReason = reason;
  appendEvent(claim, { action: 'ESCALATED', actor: await adminActor(user), note: reason, visibility: 'brand' });
  await saveClaim(claim);
  await notifyBrand(claim, 'warranty.claim_escalated', { reason });
  return getClaim(claim._id);
}

export async function deEscalate(user, id, { reason }) {
  const claim = await loadClaim(id);
  if (!claim.flags.escalated) throw new ApiError(409, 'This claim is not escalated');
  claim.flags.escalated = false;
  appendEvent(claim, { action: 'DE_ESCALATED', actor: await adminActor(user), note: reason, visibility: 'brand' });
  await saveClaim(claim);
  return getClaim(claim._id);
}

/**
 * Pauses the claim. A job not yet accepted is taken back from the offered
 * partner and not re-offered until resume; an accepted job keeps its partner
 * (tell them directly) but the claim stops following it until resumed.
 */
export async function hold(user, id, { reason }) {
  const claim = await loadClaim(id);
  if (claim.status === S.ON_HOLD) throw new ApiError(409, 'This claim is already on hold');
  appendEvent(claim, { action: 'PUT_ON_HOLD', toStatus: S.ON_HOLD, actor: await adminActor(user), note: reason, visibility: 'customer' });
  await saveClaim(claim);

  const sr = await activeJobOf(claim);
  if (sr && sr.status === 'Assigned' && !(await Job.exists({ serviceRequest: sr._id }))) {
    await ServiceRequest.updateOne({ _id: sr._id }, { serviceProvider: null, status: 'New', isAccepted: false });
  }
  return getClaim(claim._id);
}

export async function resume(user, id, { reason }) {
  const claim = await loadClaim(id);
  if (claim.status !== S.ON_HOLD) throw new ApiError(409, 'This claim is not on hold');
  appendEvent(claim, { action: 'RESUMED', toStatus: claim.statusBeforeHold, actor: await adminActor(user), note: reason, visibility: 'customer' });
  await saveClaim(claim);

  const sr = await activeJobOf(claim);
  if (sr) {
    // Catch up on anything the job did while the claim was paused, and
    // re-offer a job that nobody holds.
    await syncClaimFromJob(sr);
    if (sr.status === 'New' && !sr.serviceProvider) await dispatchServiceJob(claim._id);
  }
  return getClaim(claim._id);
}

export async function cancel(user, id, { reason }) {
  const claim = await loadClaim(id);
  // A same-status move is a no-op in appendEvent, so without this a second
  // cancel would "succeed" and notify everyone again.
  if ([S.CANCELLED, S.CLOSED, S.REJECTED].includes(claim.status)) {
    throw new ApiError(409, `This claim is already ${claim.status.toLowerCase()}`);
  }
  appendEvent(claim, { action: 'CANCELLED', toStatus: S.CANCELLED, actor: await adminActor(user), note: reason, visibility: 'customer' });
  await saveClaim(claim);
  const sr = await activeJobOf(claim);
  if (sr) await retireJob(sr, reason);
  await Promise.all([notifyCustomer(claim, 'warranty.claim_cancelled', { reason }), notifyBrand(claim, 'warranty.claim_cancelled', { reason })]);
  return getClaim(claim._id);
}

/**
 * Reopens a Rejected, Closed or Cancelled claim. `to: 'Brand Review'` sends it
 * back to the brand; `to: 'Job Created'` (not for a rejected claim) starts a
 * new Service Job straight away — e.g. the same fault came back after closing.
 */
export async function reopen(user, id, { reason, to = S.BRAND_REVIEW }) {
  const claim = await loadClaim(id);
  if (![S.REJECTED, S.CLOSED, S.CANCELLED].includes(claim.status)) throw new ApiError(409, 'Only rejected, closed or cancelled claims can be reopened');
  if (!canTransition(claim.status, to)) throw new ApiError(400, `A ${claim.status.toLowerCase()} claim can't reopen to "${to}"`);

  const actor = await adminActor(user);
  claim.rejectionReason = null;
  claim.closedAt = undefined;
  claim.cancelledAt = undefined;
  claim.flags.allocationFailed = false;
  appendEvent(claim, { action: 'REOPENED', toStatus: to, actor, note: reason, visibility: 'customer' });

  if (to === S.JOB_CREATED) {
    claim.visit = undefined;
    claim.serviceRequest = null;
    await startNewJob(claim);
  } else {
    await saveClaim(claim);
    await notifyBrand(claim, 'warranty.claim_reopened', { reason, forBrand: true });
  }
  await notifyCustomer(claim, 'warranty.claim_reopened', { reason });
  return getClaim(claim._id);
}

export async function addNote(user, id, { note }) {
  const claim = await loadClaim(id);
  appendEvent(claim, { action: 'NOTE_ADDED', actor: await adminActor(user), note, visibility: 'internal' });
  await saveClaim(claim);
  return getClaim(claim._id);
}

// ── SLA summary (Phase 9) ────────────────────────────────────────────────────

const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);

/**
 * Per brand: open claims, how many are in warning / breach now, and how the
 * brand and the network performed on the clocks that finished. `from`/`to`
 * bound claims by submission date.
 */
export async function slaSummary({ from, to } = {}) {
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  const met = (key) => ({ $ifNull: [`$sla.met.${key}`, false] });
  const onTime = (key, dueField) => ({
    $cond: [{ $and: [met(key), { $lte: [`$sla.met.${key}`, `$sla.${dueField}`] }] }, 1, 0],
  });

  const rows = await WarrantyClaim.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$brand',
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $in: ['$status', ['Closed', 'Cancelled', 'Rejected']] }, 0, 1] } },
        inWarning: { $sum: { $cond: [{ $eq: ['$sla.state', 'warning'] }, 1, 0] } },
        breached: { $sum: { $cond: [{ $eq: ['$sla.state', 'breached'] }, 1, 0] } },
        approvalsDecided: { $sum: { $cond: [met('brandApproval'), 1, 0] } },
        approvalsOnTime: { $sum: onTime('brandApproval', 'brandApprovalDueAt') },
        approvalHours: { $avg: { $cond: [met('brandApproval'), { $divide: [{ $subtract: ['$sla.met.brandApproval', '$createdAt'] }, 3600000] }, null] } },
        resolved: { $sum: { $cond: [met('resolution'), 1, 0] } },
        resolvedOnTime: { $sum: onTime('resolution', 'resolutionDueAt') },
      },
    },
  ]);

  const brands = await Brand.find({ _id: { $in: rows.map((r) => r._id) } }).select('name').lean();
  const nameOf = new Map(brands.map((b) => [String(b._id), b.name]));
  return rows
    .map((r) => ({
      brand: { id: String(r._id), name: nameOf.get(String(r._id)) || null },
      total: r.total,
      open: r.open,
      inWarning: r.inWarning,
      breached: r.breached,
      approval: { decided: r.approvalsDecided, onTimePercent: pct(r.approvalsOnTime, r.approvalsDecided), avgHours: round1(r.approvalHours) },
      resolution: { resolved: r.resolved, onTimePercent: pct(r.resolvedOnTime, r.resolved) },
    }))
    .sort((a, b) => b.breached - a.breached || b.open - a.open);
}
