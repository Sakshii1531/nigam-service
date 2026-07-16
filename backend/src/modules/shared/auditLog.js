import { AuditLog } from '../super-admin/auditLog.model.js';

/**
 * Fire-and-forget audit trail helper. Not wired into every mutating action
 * across the app (that would be a much larger retrofit) — used at a handful of
 * naturally sensitive super-admin actions (PlatformSettings changes, Brand
 * status changes) as a proof of concept for the pattern. Extending coverage to
 * every module is future work, not attempted this phase.
 */
export async function logAudit({ user, action, type }) {
  await AuditLog.create({ user: user || null, action, type });
}
