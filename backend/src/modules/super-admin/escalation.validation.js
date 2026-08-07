import { z } from 'zod';

const PRIORITIES = ['Critical', 'High', 'P1', 'P2', 'Medium', 'P3', 'Low'];
const STATUSES = ['Open', 'Unassigned', 'Under Review', 'In Progress', 'Assigned to Senior', 'Resolved'];

export const createEscalationSchema = z.object({
  serviceRequest: z.string().min(1),
  city: z.string().optional(),
  reason: z.string().optional(),
  description: z.string().optional(),
  raisedBy: z.enum(['Customer', 'Technician', 'System Auto', 'QA Team']).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

export const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const assignManagerSchema = z.object({ managerId: z.string().min(1) });
export const updateStatusSchema = z.object({ status: z.enum(STATUSES) });
export const updatePrioritySchema = z.object({ priority: z.enum(PRIORITIES) });

export const idParamSchema = z.object({ id: z.string().min(1) });
