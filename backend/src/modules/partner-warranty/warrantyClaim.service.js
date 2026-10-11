import mongoose from 'mongoose';
import { WarrantyClaim } from './warrantyClaim.model.js';
import { WarrantyGroup } from './warrantyGroup.model.js';
import { resolveSelection } from './warrantyCatalog.service.js';
import { appendEvent, saveClaim } from './claimTimeline.js';
import { CLAIM_STATUS, TERMINAL_STATUSES, customerStatusLabel } from './claimStatus.js';
import { reevaluateTicketWarranty } from '../brand-crm/ticketWarranty.service.js';
import { createTicket } from './ticketIntake.service.js';
import { TICKET_SOURCE, MAX_TICKET_VIDEOS } from './ticketConstants.js';
import { actorFromUser } from '../brand-crm/actor.js';
import { claimLinks } from './claimLinks.js';
import { confirmService } from './partnerWarrantyJob.service.js';
import { User } from '../auth/user.model.js';
import { isOwnUploadUrl } from '../shared/fileUpload.js';
import { emitToBrand } from '../notifications/notification.service.js';
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
  return open ? { id: String(open._id), message: open.message,documentKinds:open.documentKinds||[],  requestedAt: open.requestedAt } : null;
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
    rejectionCode:claim.rejectionCode||null,
    modelNumber: claim.modelNumber || null,
    serialNumber: claim.serialNumber || null,
    purchaseDate: claim.purchaseDate || null,
    warranty: {status:claim.warranty.status,message:claim.warranty.status==='Verification Required'?"We'll verify your warranty":null},
    remarks: claim.remarks || null,
    address: claim.address,
    documents: (claim.documents || []).map(documentView),
    infoRequest: openInfoRequest(claim),
    rejectionReason: claim.status === CLAIM_STATUS.REJECTED ? claim.rejectionReason : null,
    preferredVisit: claim.preferredVisit?.date ? claim.preferredVisit : null,
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

async function findOwnClaim(customerId, idOrHumanId) {
  const filter = mongoose.isValidObjectId(idOrHumanId) ? { _id: idOrHumanId } : { humanId: String(idOrHumanId).toUpperCase() };
  const claim = await WarrantyClaim.findOne({ ...filter, customer: customerId })
    .populate('brand', 'name logoUrl')
    .populate('serviceRequest', 'humanId status completionOtp');
  // Someone else's claim reads exactly like a missing one.
  if (!claim) throw new ApiError(404, 'Warranty claim not found');
  return claim;
}

/** Same document cap as before, plus at most MAX_TICKET_VIDEOS videos per ticket (brand-crm D17). */
function assertRoomFor(claim, documents) {
  if (claim.documents.length + documents.length > MAX_DOCUMENTS) {
    throw new ApiError(400, `A claim can hold at most ${MAX_DOCUMENTS} documents`);
  }
  const videos = [...claim.documents, ...documents].filter((d) => d.kind === 'video').length;
  if (videos > MAX_TICKET_VIDEOS) throw new ApiError(400, `A claim can hold at most ${MAX_TICKET_VIDEOS} videos`);
}

// ── Submit ───────────────────────────────────────────────────────────────────

export async function createClaim(customer, body) {
  const { brand, category, productType, issue } = await resolveSelection(body);

  const documents = checkDocuments(body.documents || [], customer.id);
  if (!documents.some((d) => d.kind === 'invoice')) {
    throw new ApiError(400, 'Attach the purchase bill / invoice');
  }

  const purchaseDate = new Date(body.purchaseDate);
  if (purchaseDate.getTime() > Date.now()) throw new ApiError(400, 'Purchase date cannot be in the future');

  const [address, group, actor] = await Promise.all([
    resolveAddress(customer.id, body.visitAddressId || body.visitAddress ? {addressId:body.visitAddressId,address:body.visitAddress} : body),
    body.groupId ? WarrantyGroup.findById(body.groupId).select('_id').lean() : null,
    actorFromUser(customer.id, 'customer'),
  ]);

  // Everything every ticket shares — IDs, warranty check, SLA, timeline,
  // notifications — happens in createTicket (docs/brand-crm Phase 1).
  const claim = await createTicket(
    {
      customer: customer.id,
      brand,
      category,
      productType,
      group: group?._id || null,
      issue,
      modelNumber: body.modelNumber,
      serialNumber: body.serialNumber,
      purchaseDate,
      remarks: body.remarks,
      preferredVisit: body.preferredVisit,
      documents,
      address,
    },
    { source: TICKET_SOURCE.NCC_APP, actor },
  );

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

const customerActorFor = (customerId) => actorFromUser(customerId, 'customer');

export async function addDocuments(customerId, id, { documents }) {
  const claim = await findOwnClaim(customerId, id);
  if (TERMINAL_STATUSES.includes(claim.status)) {
    throw new ApiError(409, `This claim is ${claim.status.toLowerCase()} — documents can no longer be added`);
  }
  assertRoomFor(claim, documents);
  claim.documents.push(...checkDocuments(documents, customerId));
  appendEvent(claim, {
    action: 'DOCUMENT_ADDED',
    actor: await customerActorFor(customerId),
    note: `${documents.length} document(s) added`,
    visibility: 'customer',
  });
  await reevaluateTicketWarranty(claim,await customerActorFor(customerId));
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
  assertRoomFor(claim, documents);

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
  await reevaluateTicketWarranty(claim,await customerActorFor(customerId));
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
    preferredVisit: claim.preferredVisit?.date ? claim.preferredVisit : null,
    visit: claim.visit?.date ? { date: claim.visit.date, slot: claim.visit.slot || null } : null,
    serviceJobId: sr?.humanId || null,
    // The customer's own job — what "Rate your service" rates once closed.
    serviceRequestId: sr ? String(sr._id) : null,
    completionOtp: OTP_VISIBLE_JOB_STATUSES.has(sr?.status) ? sr.completionOtp : null,
    videos: claim.documents.filter(d=>d.kind==='video').map(documentView),
    canConfirm: claim.status === S.SERVICE_COMPLETED && sr?.status === 'Customer Confirmation',
    rejectionReason: effective === S.REJECTED ? claim.rejectionReason : null,
  };
}

export async function confirmMyService(customerId, id) {
  const claim = await findOwnClaim(customerId, id);
  await confirmService(customerId, claim);
  return getMyClaim(customerId, id);
}
