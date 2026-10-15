import { z } from 'zod';
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID');

export const createReplacementApprovalSchema = z.object({
  serviceRequest: objectId,
  product: z.string().optional(),
  model: z.string().optional(),
  reason: z.string().optional(),
  serviceProviderNotes: z.string().optional(),
  serviceProvider: objectId.optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Info Requested']),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  format: z.literal('csv').optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Info Requested']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: objectId });
