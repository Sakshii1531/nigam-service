import { z } from 'zod';

export const inviteBrandUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(6),
  assignedRoles: z.array(z.string()).optional(),
});

export const updateBrandUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  assignedRoles: z.array(z.string()).optional(),
  status: z.enum(['Active', 'Suspended', 'Pending']).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
