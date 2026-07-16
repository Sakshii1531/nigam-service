import { z } from 'zod';

export const listQuerySchema = z.object({
  type: z.enum(['System', 'Support', 'User', 'Finance', 'Inventory']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});
