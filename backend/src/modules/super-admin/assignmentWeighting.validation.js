import { z } from 'zod';

export const updateWeightingSchema = z.object({
  proximityPercent: z.number().min(0).max(100),
  skillPercent: z.number().min(0).max(100),
  ratingPercent: z.number().min(0).max(100),
  workloadPercent: z.number().min(0).max(100),
});
