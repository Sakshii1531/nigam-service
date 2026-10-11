import { auditContext } from './auditContext.js';
import { AuditLog } from '../super-admin/auditLog.model.js';

// Shared append-only audit writer. Request tracking and secret redaction are
// enforced by the AuditLog schema for both this helper and direct writers.
export async function logAudit({ user, action, type, entityType, entityId, fromStatus, toStatus, reason, brand, actor, meta }) {
  await AuditLog.create({
    user: user || actor?.user || null,
    action,
    type,
    entityType: entityType || null,
    entityId: entityId || null,
    fromStatus: fromStatus || null,
    toStatus: toStatus || null,
    reason: reason || null,
    brand: brand === undefined ? auditContext.getStore()?.req?.user?.brand || null : brand,
    actor: actor || null,
    meta: meta || null,
  });
}

/**
 * Audit row for a change to anything that isn't a ticket — a rate, an invoice,
 * a role, a setting (docs/brand-crm §5). Tickets go through
 * claimTimeline.appendEvent, which writes its own rows. `action` is the
 * normalised `entity.verb` form, e.g. 'rate.updated'; `meta.changes` holds a
 * `{ field: [old, new] }` diff where one applies.
 */
export async function recordAction({ brand = null, entityType, entityId = null, action, actor, reason, meta, type = 'User' }) {
  await logAudit({ user: actor?.user, action, type, entityType, entityId, reason, brand, actor, meta });
}
