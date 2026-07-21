import { z } from 'zod';

const PRIORITIES = ['Critical', 'High', 'P1', 'P2', 'Medium', 'P3', 'Low'];
const STATUSES = ['Open', 'Unassigned', 'Under Review', 'In Progress', 'Assigned to Senior', 'Resolved'];

export const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const createEscalationSchema = z.object({
  serviceRequest: z.string().min(1),
  reason: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(PRIORITIES).default('Medium'),
  raisedBy: z.enum(['Customer', 'Technician', 'System Auto', 'QA Team']).default('Customer'),
});

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
