import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  status: z.enum(['Active', 'Pending']).optional(),
    warrantyMonths: z.coerce.number().int().positive().optional(),
slaResolutionTimeHours: z.number().min(0).optional(),
  slaAdherencePercent: z.number().min(0).max(100).optional(),
  csat: z.number().min(0).max(5).optional(),
  contractTerms: z.string().optional(),
  supportEmail: z.string().optional(),
  supportPhone: z.string().optional(),
});

// warrantyMonths is optional; unset means the platform default applies.
export const updateBrandSchema = createBrandSchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
