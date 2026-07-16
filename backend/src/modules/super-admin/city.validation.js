import { z } from 'zod';

export const createCitySchema = z.object({
  name: z.string().min(1),
  state: z.string().optional(),
  district: z.string().optional(),
  coverageAreaSqkm: z.number().min(0).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const updateCitySchema = createCitySchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
