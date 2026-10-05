import { z } from 'zod';

const email = z.string().trim().email('Enter a valid email address');

export const createBrandAdminSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email,
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  brand: z.string().min(1, 'Brand is required'),
  temporaryPassword: z.string().min(6, 'Temporary password must be at least 6 characters'),
});

export const updateBrandAdminSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: email.optional(),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional(),
  brand: z.string().min(1).optional(),
  status: z.enum(['Active', 'Suspended']).optional(),
});

export const resetTemporaryPasswordSchema = z.object({
  temporaryPassword: z.string().min(6, 'Temporary password must be at least 6 characters'),
});

export const listBrandAdminsQuerySchema = z.object({
  brand: z.string().optional(),
  status: z.enum(['Active', 'Suspended', 'Pending']).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
