import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});
