import { z } from 'zod';

export const requestPayoutSchema = z.object({
  amount: z.number().positive(),
  payoutType: z.enum(['Quick', 'Invoice']).optional(),
});

export const listPayoutsQuerySchema = z.object({
  status: z.enum(['Settled', 'Pending']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});
