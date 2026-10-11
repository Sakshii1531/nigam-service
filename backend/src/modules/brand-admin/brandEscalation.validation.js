import { z } from 'zod';
const id = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ID');
export const STATUSES = ['Open', 'Unassigned', 'Under Review', 'In Progress', 'Assigned to Senior', 'Resolved'];
const priority = z.enum(['Critical', 'High', 'Normal', 'P1', 'P2', 'Medium', 'P3', 'Low']);
export const listQuerySchema = z.object({
  from:z.coerce.date().optional(),to:z.coerce.date().optional(),
  status: z.enum([...STATUSES, 'open']).optional(), priority: priority.optional(),
  level: z.coerce.number().int().min(1).max(3).optional(), stage: z.enum(['response', 'brandApproval', 'assignment', 'visit', 'resolution', 'manual']).optional(),
  responsible: z.union([id, z.literal('me')]).optional(), warrantyClaim: id.optional(),
  overdue: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().positive().max(100).optional(), sort: z.string().optional(),
}).strict();
export const createEscalationSchema = z.object({
  warrantyClaim: id.optional(), serviceRequest: id.optional(), reason: z.string().trim().min(1).max(1000),
  description: z.string().max(2000).optional(), priority: priority.optional(),
  raisedBy: z.enum(['Customer', 'ServiceProvider', 'System Auto', 'QA Team', 'Brand User']).optional(),
}).strict().refine(v => Boolean(v.warrantyClaim) !== Boolean(v.serviceRequest), 'Choose one ticket or service request');
export const updateStatusSchema = z.object({ status: z.enum(STATUSES) }).strict();
export const updateEscalationSchema = z.object({
  status: z.enum(STATUSES.filter(v => v !== 'Resolved')).optional(), responsibleUserId: id.nullable().optional(), note: z.string().trim().min(1).max(2000).optional(),
}).strict().refine(v => Object.keys(v).length > 0, 'Supply an update');
export const resolveSchema = z.object({ resolution: z.string().trim().min(10).max(2000) }).strict();
export const idParamSchema = z.object({ id });
