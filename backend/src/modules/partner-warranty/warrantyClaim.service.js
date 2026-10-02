import mongoose from 'mongoose';
import { WarrantyClaim } from './warrantyClaim.model.js';
import { WarrantyGroup } from './warrantyGroup.model.js';
import { resolveSelection } from './warrantyCatalog.service.js';
import { appendEvent, saveClaim } from './claimTimeline.js';
import { CLAIM_STATUS, TERMINAL_STATUSES, customerStatusLabel } from './claimStatus.js';
import { slaHours, startSla } from './claimSla.js';
import { getSettings as getPlatformSettings } from '../super-admin/platformSettings.service.js';
import { claimLinks } from './claimLinks.js';
import { confirmService } from './partnerWarrantyJob.service.js';
import { User } from '../auth/user.model.js';
import { brandWarrantyMonths, escapeRegex } from '../shared/brandWarranty.js';
import { addMonths } from '../shared/warrantyEngine.js';
import { isOwnUploadUrl } from '../shared/fileUpload.js';
import { emit as emitNotification, emitToBrand, emitToAdmins } from '../notifications/notification.service.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Customer side of a partner warranty claim (docs/partner-warranty Phase 3):
// submit, list, read, add documents, answer a brand's request for more
// information. Routing to the brand is by `claim.brand` (an ObjectId) — the
// brand panel lists by it, so no one forwards anything.

const MAX_DOCUMENTS = 20;

// Service Job states in which a partner has accepted and is (or will be) on
// site — the customer then needs the completion OTP to hand over at the end,
// exactly as on a booking. Not shown before a partner accepts, nor once the
// partner has used it (the job then waits on Customer Confirmation).
const OTP_VISIBLE_JOB_STATUSES = new Set([
  'Engineer Accepted', 'Visit Scheduled', 'Engineer Reached', 'Diagnosis Done', 'Spare Required',
  'Spare Ordered', 'Spare Received', 'Repair Completed', 'Reschedule', 'Customer NA',
]);

// ── Customer view (ARCHITECTURE §12) ─────────────────────────────────────────
// Built field by field rather than by deleting from the document, so anything
// added to the model later stays hidden from customers until it is listed here.

function documentView(d) {
  return { id: String(d._id), kind: d.kind, url: d.url, name: d.name || null, uploadedAt: d.uploadedAt };
}

function openInfoRequest(claim) {
  if (claim.status !== CLAIM_STATUS.INFO_REQUESTED) return null;
  const open = [...(claim.infoRequests || [])].reverse().find((r) => !r.respondedAt);
  return open ? { id: String(open._id), message: open.message, requestedAt: open.requestedAt } : null;
}

function customerTimeline(claim) {
  return (claim.timeline || [])
    .filter((e) => e.visibility === 'customer')
    .map((e) => ({
      at: e.at,
      action: e.action,
      status: e.toStatus || null,
      statusLabel: e.toStatus ? customerStatusLabel(e.toStatus) : null,
      // Who, by role only — a brand reviewer's or admin's name is internal.
      by: e.actor.kind,
      note: e.note || null,
    }));
}

function brandSummary(brand) {
  if (!brand || !brand._id) return { id: brand ? String(brand) : null, name: null, logoUrl: null };
  return { id: String(brand._id), name: brand.name, logoUrl: brand.logoUrl || null };
}

export function toCustomerSummary(claim) {
  return {
    id: String(claim._id),
    humanId: claim.humanId,
    status: claim.status,
    statusLabel: customerStatusLabel(claim.status),
    actionNeeded: claim.status === CLAIM_STATUS.INFO_REQUESTED,
    brand: brandSummary(claim.brand),
    productName: claim.productName,
    issueName: claim.issueName,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

export function toCustomerView(claim) {
  return {
    ...toCustomerSummary(claim),
    categoryKey: claim.categoryKey,
    modelNumber: claim.modelNumber || null,
    serialNumber: claim.serialNumber || null,
    purchaseDate: claim.purchaseDate || null,
    remarks: claim.remarks || null,
    address: claim.address,
    documents: (claim.documents || []).map(documentView),
    infoRequest: openInfoRequest(claim),
    rejectionReason: claim.status === CLAIM_STATUS.REJECTED ? claim.rejectionReason : null,
    visit: claim.visit?.date ? { date: claim.visit.date, slot: claim.visit.slot || null } : null,
    serviceJobId: claim.serviceRequest?.humanId || null,
    // The job's internal id — what the rating card submits against once closed.
    serviceRequestId: claim.serviceRequest?._id ? String(claim.serviceRequest._id) : null,
    completionOtp: OTP_VISIBLE_JOB_STATUSES.has(claim.serviceRequest?.status) ? claim.serviceRequest.completionOtp : null,
    timeline: customerTimeline(claim),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function checkDocuments(documents, uploadedBy, infoRequest = null) {
  for (const d of documents) {
    if (!isOwnUploadUrl(d.url)) {
      throw new ApiError(400, 'Documents must be uploaded through the app (POST /api/v1/uploads) first');
    }
  }
  return documents.map((d) => ({ kind: d.kind, url: d.url, name: d.name, uploadedBy, uploadedAt: new Date(), infoRequest }));
}

async function resolveAddress(customerId, { addressId, address }) {
  if (addressId) {
    const user = await User.findById(customerId).select('addresses').lean();
    const saved = user?.addresses?.find((a) => String(a._id) === String(addressId));
    if (!saved) throw new ApiError(400, 'Address not found');
    address = saved;
  }
  const pincode = String(address?.pincode || '').trim();
  if (!/^\d{6}$/.test(pincode)) throw new ApiError(400, 'A 6-digit pincode is required for the service visit');
  const { name, house, landmark, city, state, latitude, longitude } = address;
  return { name, house, landmark, city, state, pincode, latitude, longitude };
}

async function warrantyEstimate(brandName, purchaseDate) {
  const months = await brandWarrantyMonths(brandName);
  if (!purchaseDate) return { status: 'Unknown', months };
  const expiresOn = addMonths(purchaseDate, months);
  return { status: Date.now() <= expiresOn.getTime() ? 'In Warranty' : 'Out of Warranty', months, expiresOn };
}

/** Open claim for the same brand + serial — a second one would just split the brand's work. */
async function findOpenDuplicate(brandId, serialNumber) {
  return WarrantyClaim.findOne({
    brand: brandId,
    serialNumber: new RegExp(`^${escapeRegex(serialNumber)}$`, 'i'),
    status: { $nin: TERMINAL_STATUSES },
  })
    .select('humanId')
    .lean();
}

async function findOwnClaim(customerId, idOrHumanId) {
  const filter = mongoose.isValidObjectId(idOrHumanId) ? { _id: idOrHumanId } : { humanId: String(idOrHumanId).toUpperCase() };
  const claim = await WarrantyClaim.findOne({ ...filter, customer: customerId })
    .populate('brand', 'name logoUrl')
    .populate('serviceRequest', 'humanId status completionOtp');
  // Someone else's claim reads exactly like a missing one.
  if (!claim) throw new ApiError(404, 'Warranty claim not found');
  return claim;
}

const customerActor = (user) => ({ kind: 'customer', user: user._id || user.id, name: user.name });

// ── Submit ───────────────────────────────────────────────────────────────────

export async function createClaim(customer, body) {
  const { brand, category, productType, issue } = await resolveSelection(body);

  const documents = checkDocuments(body.documents || [], customer.id);
  if (!documents.some((d) => d.kind === 'invoice')) {
    throw new ApiError(400, 'Attach the purchase bill / invoice');
  }

  const purchaseDate = new Date(body.purchaseDate);
  if (purchaseDate.getTime() > Date.now()) throw new ApiError(400, 'Purchase date cannot be in the future');

  const serialNumber = body.serialNumber.trim();
  const duplicate = await findOpenDuplicate(brand._id, serialNumber);
  if (duplicate) {
    throw new ApiError(409, `You already have an open claim for this product (${duplicate.humanId})`, { existingClaim: duplicate.humanId });
  }

  const [address, warrantyCheck, group] = await Promise.all([
    resolveAddress(customer.id, body),
    warrantyEstimate(brand.name, purchaseDate),
    body.groupId ? WarrantyGroup.findById(body.groupId).select('_id').lean() : null,
  ]);

  const now = new Date();
  const claim = new WarrantyClaim({
    customer: customer.id,
    brand: brand._id,
    group: group?._id || null,
    category: category._id,
    categoryKey: category.key,
    productType: productType?._id || null,
    productName: category.name,
    issue: issue._id,
    issueName: issue.name,
    modelNumber: body.modelNumber.trim(),
    serialNumber,
    purchaseDate,
    remarks: body.remarks?.trim() || undefined,
    warrantyCheck,
    documents,
    address,
    status: CLAIM_STATUS.SUBMITTED,
  });
  // SLA hours snapshot: the brand's own, else the platform's (Phase 9).
  const platform = (await getPlatformSettings())?.warrantySla?.toObject?.() || {};
  startSla(
    claim,
    {
      approval: slaHours(brand, 'approvalHours', platform),
      assignment: slaHours(brand, 'assignmentHours', platform),
      visit: slaHours(brand, 'visitHours', platform),
      resolution: slaHours(brand, 'resolutionHours', platform),
    },
    now,
  );

  appendEvent(claim, { action: 'CLAIM_SUBMITTED', actor: await customerActorFor(customer.id), visibility: 'customer' });
  await saveClaim(claim);

  const common = {
    humanId: claim.humanId,
    brandName: brand.name,
    productName: claim.productName,
    issueName: claim.issueName,
    city: address.city,
    pincode: address.pincode,
  };
  await Promise.all([
    emitNotification('warranty.claim_submitted', { ...common, user: customer.id, cta: { label: 'Track Claim', route: claimLinks.customer(claim.id) } }),
    emitToBrand('warranty.new_claim_brand', brand._id, { ...common, cta: { label: 'Review Claim', route: claimLinks.brand(claim.id) } }),
    emitToAdmins('warranty.new_claim_admin', { ...common, cta: { label: 'View Claim', route: claimLinks.admin(claim.id) } }),
  ]);

  return toCustomerView(await claim.populate('brand', 'name logoUrl'));
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function listMyClaims(customerId, { status, page, limit } = {}) {
  const query = { customer: customerId };
  if (status === 'open') query.status = { $nin: TERMINAL_STATUSES };
  else if (status === 'closed') query.status = { $in: TERMINAL_STATUSES };

  const { skip, limit: lim, page: pg } = parsePagination({ page, limit });
  const [items, total] = await Promise.all([
    WarrantyClaim.find(query).populate('brand', 'name logoUrl').sort({ createdAt: -1 }).skip(skip).limit(lim),
    WarrantyClaim.countDocuments(query),
  ]);
  return { items: items.map(toCustomerSummary), meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getMyClaim(customerId, id) {
  return toCustomerView(await findOwnClaim(customerId, id));
}

// ── Add documents / answer an info request ───────────────────────────────────

async function customerActorFor(customerId) {
  const user = await User.findById(customerId).select('name').lean();
  return customerActor({ ...user, _id: customerId });
}

export async function addDocuments(customerId, id, { documents }) {
  const claim = await findOwnClaim(customerId, id);
  if (TERMINAL_STATUSES.includes(claim.status)) {
    throw new ApiError(409, `This claim is ${claim.status.toLowerCase()} — documents can no longer be added`);
  }
  if (claim.documents.length + documents.length > MAX_DOCUMENTS) {
    throw new ApiError(400, `A claim can hold at most ${MAX_DOCUMENTS} documents`);
  }
  claim.documents.push(...checkDocuments(documents, customerId));
  appendEvent(claim, {
    action: 'DOCUMENT_ADDED',
    actor: await customerActorFor(customerId),
    note: `${documents.length} document(s) added`,
    visibility: 'customer',
  });
  await saveClaim(claim);
  return toCustomerView(claim);
}

export async function respondToInfoRequest(customerId, id, { message, documents = [] }) {
  const claim = await findOwnClaim(customerId, id);
  if (claim.status !== CLAIM_STATUS.INFO_REQUESTED) {
    throw new ApiError(409, 'The brand has not asked for more information on this claim');
  }
  const request = [...claim.infoRequests].reverse().find((r) => !r.respondedAt);
  if (!request) throw new ApiError(409, 'The brand has not asked for more information on this claim');
  if (!message?.trim() && !documents.length) throw new ApiError(400, 'Add a message or at least one document');
  if (claim.documents.length + documents.length > MAX_DOCUMENTS) {
    throw new ApiError(400, `A claim can hold at most ${MAX_DOCUMENTS} documents`);
  }

  claim.documents.push(...checkDocuments(documents, customerId, request._id));
  request.response = message?.trim() || undefined;
  request.respondedAt = new Date();
  appendEvent(claim, {
    action: 'INFO_PROVIDED',
    toStatus: CLAIM_STATUS.BRAND_REVIEW,
    actor: await customerActorFor(customerId),
    note: message?.trim() || undefined,
    visibility: 'customer',
  });
  await saveClaim(claim);

  await emitToBrand('warranty.info_provided', claim.brand._id || claim.brand, {
    humanId: claim.humanId,
    documentCount: documents.length,
    cta: { label: 'Review Claim', route: claimLinks.brand(claim.id) },
  });
  return toCustomerView(claim);
}

// ── Track Ticket (Phase 7) ───────────────────────────────────────────────────

const S = CLAIM_STATUS;

// The customer's stage list — the client's example sequence (#12), with the
// brand's review folded into one "Brand Verification" step.
const TRACK_STAGES = [
  { key: 'submitted', label: 'Claim Submitted', statuses: [S.SUBMITTED] },
  { key: 'verification', label: 'Brand Verification', statuses: [S.BRAND_REVIEW, S.INFO_REQUESTED] },
  { key: 'approved', label: 'Warranty Approved', statuses: [S.APPROVED, S.JOB_CREATED] },
  { key: 'assigned', label: 'Partner Assigned', statuses: [S.PARTNER_ASSIGNED] },
  { key: 'visit', label: 'Visit Scheduled', statuses: [S.VISIT_SCHEDULED] },
  { key: 'onTheWay', label: 'Technician On Way', statuses: [S.TECHNICIAN_ON_WAY] },
  { key: 'inProgress', label: 'Service In Progress', statuses: [S.SERVICE_IN_PROGRESS] },
  { key: 'completed', label: 'Service Completed', statuses: [S.SERVICE_COMPLETED] },
  { key: 'closed', label: 'Closed', statuses: [S.CLOSED] },
];
const ASSIGNED_INDEX = TRACK_STAGES.findIndex((s) => s.key === 'assigned');

function stageIndexOf(status) {
  return TRACK_STAGES.findIndex((s) => s.statuses.includes(status));
}

/** Last stage the claim actually reached, from its customer-visible history. */
function reachedIndex(claim) {
  let reached = 0;
  for (const e of claim.timeline) {
    if (e.visibility === 'customer' && e.toStatus) reached = Math.max(reached, stageIndexOf(e.toStatus));
  }
  return reached;
}

export async function trackMyClaim(customerId, id) {
  const claim = await findOwnClaim(customerId, id);
  await claim.populate({
    path: 'serviceRequest',
    select: 'humanId status completionOtp serviceProvider',
    populate: { path: 'serviceProvider', select: 'name phone rating avatar photo' },
  });

  const effective = claim.status === S.ON_HOLD ? claim.statusBeforeHold : claim.status;
  const ended = [S.REJECTED, S.CANCELLED].includes(effective);
  const current = ended ? reachedIndex(claim) : stageIndexOf(effective);

  const firstAt = (stage) =>
    stage.key === 'submitted'
      ? claim.createdAt
      : claim.timeline.find((e) => e.visibility === 'customer' && stage.statuses.includes(e.toStatus))?.at || null;

  let stages = TRACK_STAGES.map((stage, i) => ({
    key: stage.key,
    label: stage.label,
    // A stage can be passed without being visited (a partner who never
    // scheduled first): it still counts as done, just without a time.
    state: i < current || (i === current && effective === S.CLOSED) ? 'done' : i === current ? 'current' : 'pending',
    at: i <= current ? firstAt(stage) : null,
  }));
  if (ended) {
    // A rejected or cancelled claim ends where it stopped.
    stages = stages.slice(0, current + 1).map((s) => ({ ...s, state: 'done' }));
    const endEvent = [...claim.timeline].reverse().find((e) => e.toStatus === effective);
    stages.push({ key: effective === S.REJECTED ? 'rejected' : 'cancelled', label: customerStatusLabel(effective), state: 'current', at: endEvent?.at || null });
  }

  const sr = claim.serviceRequest && claim.serviceRequest._id ? claim.serviceRequest : null;
  const provider = sr?.serviceProvider;
  const partnerVisible = !ended && effective !== S.CLOSED && current >= ASSIGNED_INDEX && provider?.name;

  return {
    id: String(claim._id),
    humanId: claim.humanId,
    status: claim.status,
    statusLabel: customerStatusLabel(claim.status),
    actionNeeded: claim.status === S.INFO_REQUESTED,
    onHold: claim.status === S.ON_HOLD,
    stages,
    // Only once someone has accepted, and only what the customer needs to
    // meet them — never payout or dispatch details.
    partner: partnerVisible
      ? { name: provider.name, phone: provider.phone || null, rating: provider.rating || null, photo: provider.photo || provider.avatar || null }
      : null,
    visit: claim.visit?.date ? { date: claim.visit.date, slot: claim.visit.slot || null } : null,
    serviceJobId: sr?.humanId || null,
    // The customer's own job — what "Rate your service" rates once closed.
    serviceRequestId: sr ? String(sr._id) : null,
    completionOtp: OTP_VISIBLE_JOB_STATUSES.has(sr?.status) ? sr.completionOtp : null,
    canConfirm: claim.status === S.SERVICE_COMPLETED && sr?.status === 'Customer Confirmation',
    rejectionReason: effective === S.REJECTED ? claim.rejectionReason : null,
  };
}

export async function confirmMyService(customerId, id) {
  const claim = await findOwnClaim(customerId, id);
  await confirmService(customerId, claim);
  return getMyClaim(customerId, id);
}
