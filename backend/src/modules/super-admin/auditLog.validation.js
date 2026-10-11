import { z } from 'zod';
import { auditQuerySchema } from '../brand-crm/brandAudit.service.js';

export const listQuerySchema = auditQuerySchema.omit({format:true}).extend({
  brand: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  type: z.enum(['System', 'Support', 'User', 'Finance', 'Inventory', 'Warranty']).optional(),
  // Powers an ASM detail page's activity log — "what did this one account do".
  user: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});
