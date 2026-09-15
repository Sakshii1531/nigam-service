import { z } from 'zod';

export const listQuerySchema = z.object({
  type: z.enum(['System', 'Support', 'User', 'Finance', 'Inventory']).optional(),
  // Powers an ASM detail page's activity log — "what did this one account do".
  user: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});
