import { z } from 'zod';

export const createReplacementApprovalSchema = z.object({
  serviceRequest: z.string().min(1),
  product: z.string().optional(),
  model: z.string().optional(),
  reason: z.string().optional(),
  techNotes: z.string().optional(),
  technician: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Info Requested']),
});

export const listQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Info Requested']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
