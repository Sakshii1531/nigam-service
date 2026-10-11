import { TICKET_AUDIT_ACTIONS, ticketAuditMeta } from '../brand-crm/ticketAuditActions.js';
import { syncChargesForClaim } from '../brand-crm/charges.service.js';
import { runInTransaction } from '../../utils/transaction.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { getIO } from '../../sockets/io.js';
import { logAudit } from '../shared/auditLog.js';
import { canTransition, CLAIM_STATUS, customerStatusLabel } from './claimStatus.js';
import { applySlaTransition, meetSla } from './claimSla.js';
import { runClaimEffects } from './claimEffects.js';

/**
 * The only code that changes a warranty claim's status (ARCHITECTURE §4).
 *
 * Validates the move, pushes a timeline event (which is also the claim's own
 * audit trail — who, what, when, old → new, reason) and mirrors it into the
 * platform AuditLog. It mutates `claim` in memory; the caller saves, so the
 * status and its event always land in the same write.
 *
 * Pass `toStatus` to change status; omit it to record an event (a note, a
 * document, an escalation) without moving the claim.
 *
 * @param {import('mongoose').Document} claim
 * @param {object} e
 * @param {string} e.action      one of CLAIM_ACTIONS
 * @param {string} [e.toStatus]
 * @param {{kind:string,user?:any,name?:string,employeeId?:string,roles?:string[],department?:string}} e.actor
 *        an actor snapshot (brand-crm/actor.js); kind/user/name alone still work
 * @param {string} [e.note]      reason / remarks
 * @param {'customer'|'brand'|'internal'} [e.visibility]
 * @param {object} [e.meta]      structured detail (contact outcome, part status …)
 * @returns {object} the event that was pushed
 */
export function appendEvent(claim, { action, toStatus = null, actor, note, visibility = 'customer', meta }) {
  if (!actor?.kind) throw new Error('appendEvent: actor.kind is required');

  if (actor.kind === 'brand') {
    claim.firstBrandActionAt ||= new Date();
    meetSla(claim, 'response', claim.firstBrandActionAt);
  }
  const fromStatus = claim.status;
  if (toStatus && toStatus !== fromStatus) {
    if (!canTransition(fromStatus, toStatus)) {
      throw new ApiError(400, `Cannot move claim from "${fromStatus}" to "${toStatus}"`);
    }
    if (toStatus === CLAIM_STATUS.ON_HOLD) claim.statusBeforeHold = fromStatus;
    if (fromStatus === CLAIM_STATUS.ON_HOLD) claim.statusBeforeHold = null;
    if (toStatus === CLAIM_STATUS.CLOSED) claim.closedAt = new Date();
    if (toStatus === CLAIM_STATUS.CANCELLED) claim.cancelledAt = new Date();
    applySlaTransition(claim, fromStatus, toStatus);
    claim.status = toStatus;
  }

  const stage = toStatus === 'Job Created' ? 'PARTNER_FINDING' : claim.serviceRequest ? { Closed: 'CLOSED', Cancelled: 'CANCELLED' }[toStatus] : null;
  if (stage && stage !== claim.jobStage) {
    if (stage === 'PARTNER_FINDING') { claim.flags.allocationFailed = false; claim.closure = {}; }
    if (stage === 'CLOSED') claim.closure.closedAt = new Date();
    setJobStage(claim, stage, { actor });
  }
  const moved = Boolean(toStatus && toStatus !== fromStatus);
  const event = {
    at: new Date(),
    action,
    fromStatus: moved ? fromStatus : null,
    toStatus: moved ? toStatus : null,
    actor: {
      kind: actor.kind,
      user: actor.user || null,
      name: actor.name,
      employeeId: actor.employeeId || null,
      roles: actor.roles?.length ? [...actor.roles] : undefined,
      department: actor.department || null,
    },
    note,
    visibility,
    meta: meta || undefined,
  };
  claim.timeline.push(event);
  claim.$locals.pendingAudit = [...(claim.$locals.pendingAudit || []), event];
  return event;
}

/** One writer for the detailed stage and its brand-visible history. */
export function setJobStage(claim, stage, { actor = { kind: 'system', name: 'NCC' }, attempt, force = false } = {}) {
  if (stage === claim.jobStage && !force) return false;
  const previous = claim.jobStage || null;
  claim.jobStage = stage; claim.jobStageAt = new Date();
  if (stage === 'REACHED' && claim.sla?.visitDueAt) meetSla(claim, 'visit', claim.jobStageAt);
  appendEvent(claim, { action: 'JOB_STAGE_CHANGED', actor, visibility: 'brand',
    meta: { previous, stage, job: claim.serviceRequest ? String(claim.serviceRequest) : null, ...(attempt ? { attempt } : {}) }, note: `${stage.replaceAll('_', ' ')}${attempt ? ` (attempt ${attempt})` : ''}` });
  return true;
}

/**
 * Writes the AuditLog rows for events appended since the last save. Called
 * after the claim is saved, so an aborted save never leaves an audit row for
 * a change that didn't happen.
 */
export async function flushAudit(claim) {
  const pending = claim.$locals.pendingAudit || [];
  claim.$locals.pendingAudit = [];
  if (pending.length) emitClaimUpdated(claim, pending);
  // One at a time: the audit trail is read in write order, and parallel inserts
  // in the same millisecond could come back swapped.
  for (const event of pending) {
    await logAudit({
      user: event.actor.user,
      type: 'Warranty',
      action: TICKET_AUDIT_ACTIONS[event.action] || `ticket.${event.action.toLowerCase()}`,
      entityType: 'WarrantyClaim',
      entityId: claim._id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.note,
      brand: claim.brand?._id || claim.brand,
      actor: event.actor,
      meta: ticketAuditMeta(event),
    });
  }
  // Progress notifications + CRM domain events (Phase 10). After the audit
  // rows, so an event row only ever exists for a change that was saved.
  if (pending.length) await runClaimEffects(claim, pending);
}

/**
 * Saves a claim after appendEvent and writes its audit rows. A concurrent
 * change (optimisticConcurrency on the model) becomes a 409 instead of a 500,
 * so the second of two simultaneous decisions is refused cleanly.
 */
export async function saveClaim(claim, { session } = {}) {
  await persistClaim(claim, { session });
  await flushAudit(claim);
  return claim;
}

/**
 * The save half of saveClaim, for writes inside a transaction: call
 * flushAudit(claim) yourself after the commit, so an aborted transaction
 * never leaves audit rows behind.
 */
export async function persistClaim(claim, { session } = {}) {
  try {
    const write = async activeSession => {
      await syncChargesForClaim(claim, { session: activeSession });
      await claim.save(activeSession ? { session: activeSession } : undefined);
    };
    if (session) await write(session); else await runInTransaction(write);
  } catch (err) {
    if (err?.name === 'VersionError') {
      claim.$locals.pendingAudit = [];
      throw new ApiError(409, 'This claim was just updated by someone else — reload and try again');
    }
    throw err;
  }
  return claim;
}

/** appendEvent + save + audit in one call, for the common single-event case. */
export async function recordAndSave(claim, event, opts = {}) {
  appendEvent(claim, event);
  return saveClaim(claim, opts);
}

/**
 * Live update for the three apps (Phase 7). The payload is deliberately tiny —
 * id, ticket, status — and each app refetches through its own API, so nothing
 * a room shouldn't see ever travels over the socket. The customer only hears
 * about changes they can see; the brand about anything not internal-only.
 */
export function emitClaimUpdated(claim, events = []) {
  const io = getIO();
  if (!io) return;
  const payload = {
    id: String(claim._id),
    humanId: claim.humanId,
    status: claim.status,
    customerStatusLabel: customerStatusLabel(claim.status),
    updatedAt: claim.updatedAt || new Date(),
  };
  const visibilities = new Set(events.map((e) => e.visibility));
  const customerId = claim.customer?._id || claim.customer;
  const brandId = claim.brand?._id || claim.brand;
  if (visibilities.has('customer') && customerId) io.to(`user:${customerId}`).emit('warranty_claim:updated', payload);
  if ((visibilities.has('customer') || visibilities.has('brand')) && brandId) io.to(`brand:${brandId}`).emit('warranty_claim:updated', payload);
  io.to('admins').emit('warranty_claim:updated', payload);
  if (brandId && (visibilities.has('customer') || visibilities.has('brand'))) {
    if (events.some(e => ['CLAIM_APPROVED','CLAIM_REJECTED','CLAIM_SUBMITTED'].includes(e.action) || /^ESCALATION_/.test(e.action))) io.to(`brand:${brandId}`).emit('claim:updated', {...payload,jobStage:claim.jobStage,jobStageAt:claim.jobStageAt});
    if(events.some(e=>/^ESCALATION_/.test(e.action))) io.to(`brand:${brandId}`).emit('brand:escalation_updated', {id:payload.id});
  }
  if (events.some(e => e.action === 'JOB_STAGE_CHANGED' || /^PART_/.test(e.action))) {
    const stagePayload = { ...payload, jobStage: claim.jobStage, jobStageAt: claim.jobStageAt };
    if (brandId) io.to(`brand:${brandId}`).emit('claim:updated', stagePayload);
    io.to('admins').emit('claim:updated', stagePayload);
  }
}
