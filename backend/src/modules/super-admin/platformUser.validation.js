import { z } from 'zod';
import { ROLES } from '../../config/constants.js';

export const listUsersQuerySchema = z.object({
  role: z.enum(Object.values(ROLES)).optional(),
  status: z.enum(['Active', 'Suspended', 'Pending']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const updateStatusSchema = z.object({ status: z.enum(['Active', 'Suspended', 'Pending']) });

export const idParamSchema = z.object({ id: z.string().min(1) });
