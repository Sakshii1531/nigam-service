import { z } from 'zod';

export const createSparePartSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  code: z.string().optional(),
  costPrice: z.number().min(0),
  markupPercent: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
});

export const updateSparePartSchema = createSparePartSchema.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
