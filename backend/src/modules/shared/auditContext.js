import { AsyncLocalStorage } from 'node:async_hooks';

export const auditContext = new AsyncLocalStorage();
export function auditRequestContext(req, res, next) {
  auditContext.run({ req, res }, next);
}

// Defence in depth for every writer, including direct AuditLog.create calls.
const SECRET = /password|secret|token|api.?key|authorization|cookie|otp|credential/i;
export function sanitizeAudit(value, key = '') {
  if (SECRET.test(key)) return 'changed';
  if (value == null || typeof value !== 'object' || value instanceof Date || value._bsontype) return value;
  if (Array.isArray(value)) return value.map(v => sanitizeAudit(v));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeAudit(v, k)]));
}
export function fieldDiff(before = {}, after = {}, fields = Object.keys(after)) {
  return Object.fromEntries(fields.filter(k => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null))
    .map(k => [k, SECRET.test(k) ? 'changed' : [sanitizeAudit(before[k] ?? null), sanitizeAudit(after[k] ?? null)]]));
}
