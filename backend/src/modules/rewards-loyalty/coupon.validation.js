import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z.string().min(1),
  discount: z.coerce.number().positive(),
  description: z.string().optional(),
  expiry: z.coerce.date().optional(),
  applicableOn: z.array(z.enum(['product', 'service', 'plan'])).optional(),
});
