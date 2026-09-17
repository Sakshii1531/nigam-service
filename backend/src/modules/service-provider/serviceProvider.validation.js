import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  specs: z.array(z.string()).optional(),
  avatarUrl: z.string().optional(),
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

export const setAvailabilitySchema = z.object({
  availability: z.enum(['Available', 'Busy', 'Offline']),
});

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const requestCityChangeSchema = z.object({
  cityId: objectId,
  reason: z.string().trim().max(500).optional(),
});

export const cityChangeRequestIdParamSchema = z.object({ requestId: objectId });
