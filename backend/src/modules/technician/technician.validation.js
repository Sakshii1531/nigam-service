import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  specs: z.array(z.string()).optional(),
});

export const addPayoutMethodSchema = z.object({
  type: z.enum(['bank', 'upi']),
  name: z.string().optional(),
  accountNo: z.string().optional(),
  ifsc: z.string().optional(),
  holderName: z.string().optional(),
  upiId: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const methodIdParamSchema = z.object({ methodId: z.string().min(1) });
