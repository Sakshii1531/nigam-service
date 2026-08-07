import { z } from 'zod';

export const listPayoutsQuerySchema = z.object({
  status: z.enum(['Pending Approval', 'Paid']).optional(),
  partner: z.string().optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const createPayoutSchema = z.object({
  partner: z.string().min(1),
  city: z.string().optional(),
  balance: z.number().min(0),
});

// Accrue more owed onto an existing pending payout.
export const accrueSchema = z.object({
  amount: z.number().positive(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
