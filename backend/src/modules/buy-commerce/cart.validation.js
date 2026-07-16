import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().optional(),
});

export const productIdParamSchema = z.object({ productId: z.string().min(1) });
