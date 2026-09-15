import { AuditLog } from './auditLog.model.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listAuditLogs({ type, user, page, limit, sort } = {}) {
  const query = {};
  if (type) query.type = type;
  if (user) query.user = user;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    // The log viewer shows who acted, so resolve the actor rather than returning
    // a bare ObjectId. `user` is null for system-generated entries.
    AuditLog.find(query).populate('user', 'name role').sort(sortObj).skip(skip).limit(lim),
    AuditLog.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}
