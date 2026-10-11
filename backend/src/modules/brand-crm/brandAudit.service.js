import { z } from 'zod';
import mongoose from 'mongoose';
import { AuditLog } from '../super-admin/auditLog.model.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { dateRange } from './billing.service.js';

const objectId = z.string().refine(mongoose.isValidObjectId, 'Invalid ID');
export const auditQuerySchema = z.object({
  entityType: z.string().trim().max(80).optional(), entityId: objectId.optional(),
  action: z.string().trim().max(150).optional(), userId: objectId.optional(),
  from: z.coerce.date().optional(), to: z.coerce.date().optional(), q: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().positive().max(100000).optional(), limit: z.coerce.number().int().positive().max(100).optional(),
  format: z.enum(['csv']).optional(), nonTimeline: z.enum(['true']).optional(),
}).strict();
const entities = { ticket:['ticket','WarrantyClaim'], customer:['customer','Customer'], policy:['policy','WarrantyPolicy'],
  serial_import:['serial_import','ProductSerial'], rate:['rate','BrandRate'], billing_line:['billing_line','BillingLine'],
  invoice:['invoice','BrandInvoice'], payment:['payment','BrandPayment'], user:['user','User'], role:['role','Role'],
  team:['team','Team'], settings:['settings','BrandSettings','Brand'], api_key:['api_key','ApiKey'], intake:['intake'], webhook:['webhook'], escalation:['escalation','Escalation'] };
export function auditQuery(brand, filters, { includeInternal = false } = {}) {
  const query = { brand };
  if (!includeInternal) query.$and = [{$or:[{entityType:{$ne:'WarrantyClaim'}},{'meta.visibility':{$in:['brand','customer']}}]}];
  if (filters.entityType) query.entityType = { $in: entities[filters.entityType] || [filters.entityType] };
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.action) query.action = filters.action;
  if (filters.userId) query.user = filters.userId;
  const range = dateRange(filters.from, filters.to);
  if (Object.keys(range).length) query.createdAt = range;
  if (filters.nonTimeline) query['meta.timelineAction'] = { $exists: false };
  if (filters.q) {
    const re = new RegExp(filters.q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
    query.$or = ['action','reason','actor.name','actor.employeeId','actor.roles','entityType'].map(key => ({ [key]: re }));
  }
  return query;
}
export async function listBrandAudit(brand, filters) {
  const query = auditQuery(brand, filters), p = parsePagination(filters);
  const [items, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt:-1, _id:-1 }).skip(p.skip).limit(p.limit), AuditLog.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({page:p.page,limit:p.limit,total}) };
}
export function csvCell(value) {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}
export const AUDIT_CSV_COLUMNS = ['Time','User','Employee ID','Roles','Action','Entity type','Entity ID','Changes','Reason'];
export function auditCsvRow(row) {
  return [row.createdAt?.toISOString(),row.actor?.name,row.actor?.employeeId,row.actor?.roles?.join('; '),row.action,row.entityType,row.entityId,row.meta?.changes,row.reason].map(csvCell).join(',')+'\r\n';
}
