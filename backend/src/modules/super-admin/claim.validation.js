import { z } from 'zod';

export const listQuerySchema = z.object({
  status: z.enum(['Pending Approval', 'Approved', 'Rejected']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const updateStatusSchema = z.object({ status: z.enum(['Pending Approval', 'Approved', 'Rejected']) });

export const idParamSchema = z.object({ id: z.string().min(1) });
