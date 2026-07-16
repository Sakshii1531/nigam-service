import { z } from 'zod';

export const createAsmSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().min(1),
  user: z.string().optional(),
});

export const updateAsmSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  user: z.string().optional(),
});

export const partnerSchema = z.object({ partnerId: z.string().min(1) });

export const listQuerySchema = z.object({ city: z.string().optional() });

export const idParamSchema = z.object({ id: z.string().min(1) });

// Must list every dynamic segment (see team.validation.js's memberParamSchema
// for why) — the remove-partner route has both :id and :partnerId.
export const partnerParamSchema = z.object({ id: z.string().min(1), partnerId: z.string().min(1) });
