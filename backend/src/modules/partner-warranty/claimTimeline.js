import { ApiError } from '../../middleware/errorHandler.js';
import { logAudit } from '../shared/auditLog.js';
import { canTransition, CLAIM_STATUS } from './claimStatus.js';

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
 * @param {{kind:string,user?:any,name?:string}} e.actor
 * @param {string} [e.note]      reason / remarks
 * @param {'customer'|'brand'|'internal'} [e.visibility]
 * @returns {object} the event that was pushed
 */
export function appendEvent(claim, { action, toStatus = null, actor, note, visibility = 'customer' }) {
  if (!actor?.kind) throw new Error('appendEvent: actor.kind is required');

  const fromStatus = claim.status;
  if (toStatus && toStatus !== fromStatus) {
    if (!canTransition(fromStatus, toStatus)) {
      throw new ApiError(400, `Cannot move claim from "${fromStatus}" to "${toStatus}"`);
    }
    if (toStatus === CLAIM_STATUS.ON_HOLD) claim.statusBeforeHold = fromStatus;
    if (fromStatus === CLAIM_STATUS.ON_HOLD) claim.statusBeforeHold = null;
    if (toStatus === CLAIM_STATUS.CLOSED) claim.closedAt = new Date();
    if (toStatus === CLAIM_STATUS.CANCELLED) claim.cancelledAt = new Date();
    claim.status = toStatus;
  }

  const moved = Boolean(toStatus && toStatus !== fromStatus);
  const event = {
    at: new Date(),
    action,
    fromStatus: moved ? fromStatus : null,
    toStatus: moved ? toStatus : null,
    actor: { kind: actor.kind, user: actor.user || null, name: actor.name },
    note,
    visibility,
  };
  claim.timeline.push(event);
  claim.$locals.pendingAudit = [...(claim.$locals.pendingAudit || []), event];
  return event;
}

/**
 * Writes the AuditLog rows for events appended since the last save. Called
 * after the claim is saved, so an aborted save never leaves an audit row for
 * a change that didn't happen.
 */
export async function flushAudit(claim) {
  const pending = claim.$locals.pendingAudit || [];
  claim.$locals.pendingAudit = [];
  // One at a time: the audit trail is read in write order, and parallel inserts
  // in the same millisecond could come back swapped.
  for (const event of pending) {
    await logAudit({
      user: event.actor.user,
      type: 'Warranty',
      action: `${claim.humanId || claim.id}: ${event.action}${event.toStatus ? ` → ${event.toStatus}` : ''}`,
      entityType: 'WarrantyClaim',
      entityId: claim._id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.note,
    });
  }
}

/** appendEvent + save + audit in one call, for the common single-event case. */
export async function recordAndSave(claim, event, { session } = {}) {
  appendEvent(claim, event);
  await claim.save(session ? { session } : undefined);
  await flushAudit(claim);
  return claim;
}
