import { z } from 'zod';

export const listRevenueQuerySchema = z.object({
  source: z.string().optional(),
  // Inclusive window filter against the row's own period.
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

// `net` and `marginPercent` are deliberately absent — the service derives both
// from gross/partnerShare so a client can never post figures that don't add up.
export const createRevenueSchema = z.object({
  source: z.string().min(1),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  gross: z.number().min(0),
  partnerShare: z.number().min(0).optional(),
});

export const updateRevenueSchema = createRevenueSchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
