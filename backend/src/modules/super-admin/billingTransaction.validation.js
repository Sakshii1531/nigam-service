import { z } from 'zod';

const TYPES = ['Service Fee', 'Payout', 'Brand Share', 'Refund'];
const STATUSES = ['Paid', 'Pending', 'Failed'];

export const listBillingQuerySchema = z.object({
  type: z.enum(TYPES).optional(),
  status: z.enum(STATUSES).optional(),
  user: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const createBillingSchema = z.object({
  user: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(TYPES),
  status: z.enum(STATUSES).optional(),
  description: z.string().optional(),
});

export const updateBillingStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
