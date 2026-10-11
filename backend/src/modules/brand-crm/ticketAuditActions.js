import { CLAIM_ACTIONS } from '../partner-warranty/claimStatus.js';
// Timeline identifiers remain stable for notifications/webhooks. Only their
// audit mirror is normalized here, in one complete table.
const overrides = {
  CLAIM_SUBMITTED:'ticket.created', CLAIM_APPROVED:'ticket.approved', CLAIM_REJECTED:'ticket.rejected',
  CLAIM_CLOSED:'ticket.closed', NOTE_ADDED:'ticket.note_added', PUT_ON_HOLD:'ticket.held',
  PRIORITY_CHANGED:'ticket.priority_changed', CCE_ASSIGNED:'ticket.cce_assigned',
};
export const TICKET_AUDIT_ACTIONS = Object.freeze(Object.fromEntries(CLAIM_ACTIONS.map(action =>
  [action, overrides[action] || `ticket.${action.toLowerCase()}`])));
export function ticketAuditMeta(event) {
  const meta = {...event.meta, timelineAction:event.action, visibility:event.visibility};
  if (event.fromStatus || event.toStatus) meta.changes = {...meta.changes,status:[event.fromStatus,event.toStatus]};
  if (event.action === 'PRIORITY_CHANGED') meta.changes = {...meta.changes,priority:[event.meta?.previous,event.meta?.priority]};
  if (event.action === 'JOB_STAGE_CHANGED') meta.changes = {...meta.changes,jobStage:[event.meta?.previous,event.meta?.stage]};
  return meta;
}
