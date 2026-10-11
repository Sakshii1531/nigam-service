import { z } from 'zod';
import { BRAND_DEPARTMENTS } from '../brand-crm/permissions.js';

const employeeId = z.string().trim().min(1).max(30);
const department = z.enum(BRAND_DEPARTMENTS);

export const inviteBrandUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(6),
  assignedRoles: z.array(z.string()).optional(),
  employeeId: employeeId.optional(),
  department: department.optional(),
});

export const updateBrandUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  assignedRoles: z.array(z.string()).optional(),
  status: z.enum(['Active', 'Suspended', 'Pending']).optional(),
  employeeId: employeeId.optional(),
  department: department.optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
