import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  status: z.enum(['Active', 'Pending']).optional(),
  slaResolutionTimeHours: z.number().min(0).optional(),
  slaAdherencePercent: z.number().min(0).max(100).optional(),
  csat: z.number().min(0).max(5).optional(),
  contractTerms: z.string().optional(),
});

export const updateBrandSchema = createBrandSchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
