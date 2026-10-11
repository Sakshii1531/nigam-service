import { ticketBilling } from './charges.service.js';
import { ticketParts } from './ticketParts.service.js';
import mongoose from 'mongoose';
import { JOB_STAGES } from '../partner-warranty/ticketConstants.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { applianceIdentity } from '../shared/applianceIdentity.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { appendEvent, saveClaim } from '../partner-warranty/claimTimeline.js';
import { actorFromUser } from './actor.js';
import { ticketBucket } from './ticketQueue.js';
import { slaStages } from '../partner-warranty/claimSla.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export const ACTIVITY_TYPES = ['status', 'communication', 'job', 'parts', 'sla', 'billing', 'notes'];
export function activityType(event) {
  const a = event.action;
  if (a === 'NOTE_ADDED') return 'notes';
  if (/CONTACT|NOTIFIED|INFO_|DOCUMENT|CALL|WHATSAPP|SMS|EMAIL/.test(a)) return 'communication';
  if (/SLA|ESCALAT/.test(a)) return 'sla';
  if (/PART_|PARTS_/.test(a)) return 'parts';
  if (/BILL|INVOICE|PAYMENT|CHARGE/.test(a)) return 'billing';
  if (/JOB_|PARTNER_|VISIT_|TECHNICIAN_|ALLOCATION|RESCHEDULE|RATED|CONFIRM/.test(a)) return 'job';
  return 'status';
}
const actor = a => a ? {
  kind: a.kind, name: ['brand', 'customer', 'partner'].includes(a.kind) ? a.name || a.kind : 'NCC',
  employeeId: a.kind === 'brand' ? a.employeeId || null : null,
  ...(a.kind === 'brand' ? { user: a.user ? String(a.user) : null, roles: a.roles || [], department: a.department || null } : {}),
} : null;
export function brandActivity(claim) {
  return [...claim.timeline].reverse().filter(e => e.visibility !== 'internal').map(e => ({
    id: String(e._id), at: e.at, action: e.action, type: activityType(e), fromStatus: e.fromStatus,
    toStatus: e.toStatus, by: actor(e.actor), note: e.note || null, brandOnly: e.visibility === 'brand',
    ...(['CUSTOMER_CONTACTED','CUSTOMER_NOTIFIED','RESCHEDULE_REQUESTED','RESCHEDULED'].includes(e.action) ? {meta:Object.fromEntries(['channel','direction','outcome','durationSec','callbackAt','contactRequestId','template','delivery','date','slot','preferred'].filter(k=>e.meta?.[k]!==undefined).map(k=>[k,e.meta[k]]))} : {}),
    // Explicit allow-list: arbitrary internal metadata never becomes a brand projection.
    ...(e.action === 'JOB_STAGE_CHANGED' ? { meta: { stage: e.meta?.stage, previous: e.meta?.previous, attempt: e.meta?.attempt } } : {}),
  }));
}
async function load(user, id) {
  const key = mongoose.isValidObjectId(id) ? { _id: id } : { humanId: id.toUpperCase() };
  const c = await WarrantyClaim.findOne({ ...key, brand: user.brand })
    .populate('customer', 'humanId name phone alternatePhone email')
    .populate('category', 'key name').populate('productType', 'name')
    .populate('documents.uploadedBy', 'name employeeId')
    .populate({ path: 'serviceRequest', select: 'humanId status isAccepted serviceProvider appliance',
      populate: { path: 'serviceProvider', select: 'name phone avatarUrl rating' } });
  if (!c) throw new ApiError(404, 'Ticket not found');
  const appliance = await OwnedAppliance.findOne({ user: c.customer?._id || c.customer, brandRef: c.brand, identityKey: applianceIdentity({ brandRef: c.brand, category: c.categoryKey, modelNumber: c.modelNumber, serialNumber: c.serialNumber }) }).select('_id').lean();
  c.$locals.applianceId = appliance ? String(appliance._id) : null;
  return c;
}
export function sectionedTicket(c, now = Date.now()) {
  const sr = c.serviceRequest?._id ? c.serviceRequest : null;
  const u = c.customer?._id ? c.customer : null;
  const decision = [...c.timeline].reverse().find(e => ['CLAIM_APPROVED', 'CLAIM_REJECTED'].includes(e.action));
  const activity = brandActivity(c);
  const stages = slaStages(c, now);
  return {
    ticket: { id: c.id, humanId: c.humanId, brandTicketNo: c.brandTicketNo, source: c.source,
      sourceRef: c.sourceRef ? { externalId: c.sourceRef.externalId, channelMessageId: c.sourceRef.channelMessageId, callId: c.sourceRef.callId } : null,
      status: c.status, statusLabel: c.status === 'Submitted' ? 'Pending Approval' : c.status, priority: c.priority,
      bucket: ticketBucket(c), createdAt: c.createdAt, firstBrandActionAt: c.firstBrandActionAt || null,
      registeredBy: actor(c.registeredBy), assignedCce: c.assignedCce ? { ...actor(c.assignedCce), assignedAt: c.assignedCce.assignedAt } : null,
      sla: { stages, state: c.sla?.pausedAt ? 'paused' : stages.some(s => s.state === 'breached') ? 'breached' : stages.some(s => s.state === 'warning') ? 'warning' : 'ok' },
      flags: { escalated: Boolean(c.flags?.escalated), allocationFailed: Boolean(c.flags?.allocationFailed) } },
    customer: u ? { id: String(u._id), humanId: u.humanId, name: u.name, phone: u.phone,
      alternatePhone: u.alternatePhone || c.customerSnapshot?.alternatePhone || null,
      email: u.email || c.customerSnapshot?.email || null, address: c.address, profileUrl: `/brand-admin/customers/${u._id}` } : null,
    product: { name: c.productName, category: c.category?.name || c.categoryKey, categoryKey: c.categoryKey,
      productType: c.productType?.name || null, modelNumber: c.modelNumber || null, serialNumber: c.serialNumber || null,
      purchaseDate: c.purchaseDate || null, serviceType: c.serviceType, applianceId: c.$locals.applianceId || (sr?.appliance ? String(sr.appliance) : null) },
    warranty: { status: c.warranty?.status, reasons: c.warranty?.reasons || [], expiresOn: c.warranty?.expiresOn || null,
      months: c.warranty?.months ?? null, policy: c.warranty?.policy || null, verifiedBy: actor(c.warranty?.verifiedBy), overrideNote: c.warranty?.overrideNote || null },
    complaint: { issueName: c.issueName, remarks: c.remarks || null, preferredVisit: c.preferredVisit?.date ? c.preferredVisit : null,
      documents: c.documents.map(d => ({ id: String(d._id), kind: d.kind, url: d.url, name: d.name || null,
        uploadedBy: d.uploadedBy?.name ? { name: d.uploadedBy.name, employeeId: d.uploadedBy.employeeId || null } : null,
        uploadedAt: d.uploadedAt, infoRequest: d.infoRequest ? String(d.infoRequest) : null })),
      infoRequests: c.infoRequests.map(r => ({ id: String(r._id), message: r.message, documentKinds: r.documentKinds || [], requestedAt: r.requestedAt, response: r.response || null, respondedAt: r.respondedAt || null })),
      pendingReschedule: c.pendingReschedule?.status ? c.pendingReschedule : null,
      contactRequests: c.contactRequests.map(r => ({ id: String(r._id), reason: r.reason, status: r.status, requestedAt: r.requestedAt, requestedBy: actor(r.requestedBy), outcome: r.outcome || null, doneAt: r.doneAt || null })) },
    approval: { decision: decision ? decision.action === 'CLAIM_APPROVED' ? 'approved' : 'rejected' : null,
      coverageDecision: c.coverageDecision, by: actor(decision?.actor), at: decision?.at || null, remarks: decision?.note || null,
      rejectionCode: c.rejectionCode, reason: c.rejectionReason, hold: c.status === 'On Hold' ? { reason: c.holdReason, by: actor(c.heldBy) } : null },
    job: sr ? { id: String(sr._id), nccJobId: sr.humanId, status: sr.status, jobStage: c.jobStage || null, jobStageAt: c.jobStageAt || null,
      stages: JOB_STAGES.map(stage => ({ stage, at: [...c.timeline].reverse().find(e => e.action === 'JOB_STAGE_CHANGED' && e.meta?.stage === stage && (!e.meta?.job || e.meta.job === String(sr._id)))?.at || null })),
      partner: sr.isAccepted && sr.serviceProvider?.name ? { name: sr.serviceProvider.name, phone: sr.serviceProvider.phone || null,
        photo: sr.serviceProvider.avatarUrl || null, rating: sr.serviceProvider.rating } : null,
      technician: null, visit: c.visit?.date ? c.visit : null,
      allocation: { attempts: c.allocation.attempts.filter(a => String(a.serviceRequest) === String(sr._id)).map((a, i) => ({ id: String(a._id), partner: { name: a.outcome === 'accepted' ? a.partnerName : `Partner ${i + 1}` }, offeredAt: a.offeredAt, outcome: a.outcome || 'offered', resolvedAt: a.resolvedAt || null, reason: a.outcome === 'timeout' ? 'Offer expired' : a.outcome === 'declined' ? 'Partner declined' : a.outcome === 'withdrawn' ? 'Offer withdrawn' : null })), failed: Boolean(c.flags?.allocationFailed) } } : null,
    parts: [], billing: null, closure: c.closure?.serviceReport?.summary || c.closedAt || c.closure?.customerConfirmedAt ? {
      serviceReport: c.closure?.serviceReport || null, customerConfirmedAt: c.closure?.customerConfirmedAt || null,
      confirmationMethod: c.closure?.confirmationMethod || null, rating: c.closure?.rating ?? null,
      feedback: c.closure?.feedback || null, closedAt: c.closure?.closedAt || c.closedAt || null } : null,
    activity,
  };
}
export async function getTicket(user, id) {
  let c = await load(user, id);
  if (c.status === 'Submitted' || !c.firstBrandActionAt) {
    c.firstBrandActionAt ||= new Date();
    appendEvent(c, { action: 'BRAND_OPENED', toStatus: c.status === 'Submitted' ? 'Brand Review' : null, actor: await actorFromUser(user.id, 'brand') });
    try { await saveClaim(c); } catch (e) { if (e.statusCode !== 409) throw e; c = await load(user, id); }
  }
  const result=sectionedTicket(c);
  result.parts=await ticketParts(c._id,user.brand);
  result.billing=await ticketBilling(c);
  return result;
}
export async function getActivity(user, id, query) {
  const c = await load(user, id), p = parsePagination(query);
  const all = brandActivity(c).filter(e => !query.type || e.type === query.type);
  return { items: all.slice(p.skip, p.skip + p.limit), meta: paginationMeta({ page: p.page, limit: p.limit, total: all.length }) };
}
