import mongoose from 'mongoose';
import { WarrantyClaim } from './warrantyClaim.model.js';
import { appendEvent, saveClaim } from './claimTimeline.js';
import { CLAIM_STATUS, CLAIM_STATUSES, customerStatusLabel } from './claimStatus.js';
import { claimLinks } from './claimLinks.js';
import { approveAndCreateJob } from './claimJob.service.js';
import { User } from '../auth/user.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { escapeRegex } from '../shared/brandWarranty.js';
import { emit as emitNotification, emitToAdmins } from '../notifications/notification.service.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// A partner brand's warranty-claim queue (docs/partner-warranty Phase 4).
// Every query is scoped by `brand: <the caller's brand>` — a claim of another
// brand is indistinguishable from one that doesn't exist.

const S = CLAIM_STATUS;

/** Statuses in which the brand still owes a decision. */
const DECIDABLE = [S.SUBMITTED, S.BRAND_REVIEW, S.INFO_REQUESTED];

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// ── Views ────────────────────────────────────────────────────────────────────

function actorLabel(actor) {
  // A brand sees its own reviewers and the customer by name; NCC's staff and
  // the system appear as "NCC".
  if (actor.kind === 'brand' || actor.kind === 'customer') return actor.name || actor.kind;
  if (actor.kind === 'partner') return actor.name || 'Service Partner';
  return 'NCC';
}

function brandTimeline(claim) {
  return (claim.timeline || [])
    .filter((e) => e.visibility !== 'internal')
    .map((e) => ({
      id: String(e._id),
      at: e.at,
      action: e.action,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      by: { kind: e.actor.kind, name: actorLabel(e.actor) },
      note: e.note || null,
      brandOnly: e.visibility === 'brand',
    }));
}

function customerSummary(customer) {
  if (!customer || !customer._id) return null;
  return { id: String(customer._id), name: customer.name, phone: customer.phone || null };
}

function toBrandSummary(claim) {
  return {
    id: String(claim._id),
    humanId: claim.humanId,
    status: claim.status,
    customer: customerSummary(claim.customer),
    productName: claim.productName,
    categoryKey: claim.categoryKey,
    issueName: claim.issueName,
    modelNumber: claim.modelNumber || null,
    serialNumber: claim.serialNumber || null,
    location: { city: claim.address?.city || null, pincode: claim.address?.pincode || null },
    warrantyCheck: claim.warrantyCheck?.status || 'Unknown',
    approvalDueAt: claim.sla?.brandApprovalDueAt || null,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

function toBrandView(claim) {
  const sr = claim.serviceRequest && claim.serviceRequest._id ? claim.serviceRequest : null;
  return {
    ...toBrandSummary(claim),
    customerStatusLabel: customerStatusLabel(claim.status),
    purchaseDate: claim.purchaseDate || null,
    remarks: claim.remarks || null,
    warrantyCheck: claim.warrantyCheck || { status: 'Unknown' },
    address: claim.address,
    documents: (claim.documents || []).map((d) => ({
      id: String(d._id),
      kind: d.kind,
      url: d.url,
      name: d.name || null,
      uploadedAt: d.uploadedAt,
      infoRequest: d.infoRequest ? String(d.infoRequest) : null,
    })),
    infoRequests: (claim.infoRequests || []).map((r) => ({
      id: String(r._id),
      message: r.message,
      requestedAt: r.requestedAt,
      response: r.response || null,
      respondedAt: r.respondedAt || null,
    })),
    rejectionReason: claim.rejectionReason || null,
    serviceJob: sr
      ? {
          id: String(sr._id),
          humanId: sr.humanId,
          status: sr.status,
          partner: sr.serviceProvider?.name ? { name: sr.serviceProvider.name } : null,
        }
      : null,
    visit: claim.visit?.date ? { date: claim.visit.date, slot: claim.visit.slot || null } : null,
    timeline: brandTimeline(claim),
  };
}

// ── Loading ──────────────────────────────────────────────────────────────────

async function findBrandClaim(brandId, idOrHumanId) {
  const key = mongoose.isValidObjectId(idOrHumanId) ? { _id: idOrHumanId } : { humanId: String(idOrHumanId).toUpperCase() };
  const claim = await WarrantyClaim.findOne({ ...key, brand: brandId })
    .populate('customer', 'name phone')
    .populate({ path: 'serviceRequest', select: 'humanId status serviceProvider', populate: { path: 'serviceProvider', select: 'name' } });
  if (!claim) throw new ApiError(404, 'Warranty claim not found');
  return claim;
}

async function brandActor(user) {
  const u = await User.findById(user.id).select('name').lean();
  return { kind: 'brand', user: user.id, name: u?.name || 'Brand' };
}

function assertDecidable(claim) {
  if (!DECIDABLE.includes(claim.status)) {
    throw new ApiError(409, `This claim is already ${claim.status.toLowerCase()} — it can no longer be decided by the brand`);
  }
}

async function brandName(brandId) {
  const b = await Brand.findById(brandId).select('name').lean();
  return b?.name || 'The brand';
}

// ── Queue ────────────────────────────────────────────────────────────────────

/**
 * @param {string} brandId from the caller's token
 * @param {object} q  status (one or comma-separated), q (ticket / serial / model /
 *                    product / issue), from/to (created date), category (key), pincode
 */
export async function listClaims(brandId, { status, q, from, to, category, pincode, page, limit, sort } = {}) {
  const base = { brand: oid(brandId) };
  const query = { ...base };

  if (status) {
    const wanted = String(status).split(',').map((s) => s.trim()).filter((s) => CLAIM_STATUSES.includes(s));
    query.status = { $in: wanted };
  }
  if (category) query.categoryKey = category;
  if (pincode) query['address.pincode'] = pincode;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    query.$or = [{ humanId: rx }, { serialNumber: rx }, { modelNumber: rx }, { productName: rx }, { issueName: rx }];
  }

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total, countRows] = await Promise.all([
    WarrantyClaim.find(query).populate('customer', 'name phone').sort(sortObj).skip(skip).limit(lim),
    WarrantyClaim.countDocuments(query),
    // Tab badges count the brand's whole queue, not just the filtered page.
    WarrantyClaim.aggregate([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const counts = Object.fromEntries(countRows.map((r) => [r._id, r.count]));
  return { items: items.map(toBrandSummary), meta: { ...paginationMeta({ page: pg, limit: lim, total }), counts } };
}

/** Opening a new claim moves it to Brand Review — the customer sees "Brand Verification". */
export async function getClaim(user, id) {
  const claim = await findBrandClaim(user.brand, id);
  if (claim.status === S.SUBMITTED) {
    appendEvent(claim, { action: 'BRAND_OPENED', toStatus: S.BRAND_REVIEW, actor: await brandActor(user), visibility: 'customer' });
    try {
      await saveClaim(claim);
    } catch (err) {
      // Another reviewer opened it at the same moment — theirs counts.
      if (err.statusCode !== 409) throw err;
      return toBrandView(await findBrandClaim(user.brand, id));
    }
  }
  return toBrandView(claim);
}

// ── Decisions ────────────────────────────────────────────────────────────────

function customerCta(claim) {
  return { label: 'View Claim', route: claimLinks.customer(claim.id) };
}

/**
 * Approval and the Service Job are one step (Phase 5): the claim moves
 * Approved → Job Created with an NCCJ job in the same transaction, then the
 * job is offered to the nearest eligible partner.
 */
export async function approveClaim(user, id, { remarks } = {}) {
  const found = await findBrandClaim(user.brand, id);
  assertDecidable(found);
  const actor = await brandActor(user);

  await approveAndCreateJob({ _id: found._id, brand: found.brand, __v: found.__v }, (claim) => {
    assertDecidable(claim);
    appendEvent(claim, {
      action: 'CLAIM_APPROVED',
      toStatus: S.APPROVED,
      actor,
      note: remarks?.trim() || undefined,
      visibility: 'customer',
    });
  }).catch((err) => {
    // The version in the filter moved: someone else decided it first.
    if (err.statusCode === 404) throw new ApiError(409, 'This claim was just updated by someone else — reload and try again');
    throw err;
  });

  const claim = await findBrandClaim(user.brand, found._id);
  const name = await brandName(user.brand);
  await Promise.all([
    emitNotification('warranty.claim_approved', { user: claim.customer._id, humanId: claim.humanId, brandName: name, cta: customerCta(claim) }),
    emitToAdmins('warranty.claim_decided_admin', {
      humanId: claim.humanId,
      brandName: name,
      decision: 'Approved',
      cta: { label: 'View Claim', route: claimLinks.admin(claim.id) },
    }),
  ]);
  return toBrandView(claim);
}

export async function rejectClaim(user, id, { reason }) {
  const text = reason?.trim();
  if (!text || text.length < 5) throw new ApiError(400, 'A rejection reason is required (at least 5 characters)');

  const claim = await findBrandClaim(user.brand, id);
  assertDecidable(claim);
  claim.rejectionReason = text;
  appendEvent(claim, { action: 'CLAIM_REJECTED', toStatus: S.REJECTED, actor: await brandActor(user), note: text, visibility: 'customer' });
  await saveClaim(claim);

  const name = await brandName(user.brand);
  await Promise.all([
    emitNotification('warranty.claim_rejected', { user: claim.customer._id, humanId: claim.humanId, brandName: name, reason: text, cta: customerCta(claim) }),
    emitToAdmins('warranty.claim_decided_admin', {
      humanId: claim.humanId,
      brandName: name,
      decision: 'Rejected',
      reason: text,
      cta: { label: 'View Claim', route: claimLinks.admin(claim.id) },
    }),
  ]);
  return toBrandView(claim);
}

export async function requestInfo(user, id, { message }) {
  const text = message?.trim();
  if (!text || text.length < 5) throw new ApiError(400, 'Tell the customer what you need (at least 5 characters)');

  const claim = await findBrandClaim(user.brand, id);
  if (claim.status === S.INFO_REQUESTED) {
    throw new ApiError(409, 'The customer has not answered the previous request yet');
  }
  assertDecidable(claim);

  const actor = await brandActor(user);
  claim.infoRequests.push({ message: text, requestedBy: user.id, requestedAt: new Date() });
  appendEvent(claim, { action: 'INFO_REQUESTED', toStatus: S.INFO_REQUESTED, actor, note: text, visibility: 'customer' });
  await saveClaim(claim);

  await emitNotification('warranty.info_requested', {
    user: claim.customer._id,
    humanId: claim.humanId,
    brandName: await brandName(user.brand),
    message: text,
    cta: { label: 'Upload Now', route: claimLinks.customer(claim.id) },
  });
  return toBrandView(claim);
}

/** Brand-internal note: visible to the brand and NCC, never to the customer. */
export async function addNote(user, id, { note }) {
  const claim = await findBrandClaim(user.brand, id);
  appendEvent(claim, { action: 'NOTE_ADDED', actor: await brandActor(user), note: note.trim(), visibility: 'brand' });
  await saveClaim(claim);
  return toBrandView(claim);
}
