import { z } from 'zod';

export const upsertRateCardSchema = z.object({
  category: z.string().min(1),
  serviceType: z.string().min(1),
  laborRate: z.number().min(0),
  partsMarkupPercent: z.number().min(0).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
