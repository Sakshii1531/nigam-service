import { z } from 'zod';

export const createServicePartnerSchema = z.object({
  name: z.string().min(1),
  manager: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().min(1),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const updateServicePartnerSchema = z.object({
  name: z.string().min(1).optional(),
  manager: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const listQuerySchema = z.object({ city: z.string().optional() });

export const idParamSchema = z.object({ id: z.string().min(1) });
