import { z } from 'zod';

export const listRegistrationsQuerySchema = z.object({
  verificationStatus: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

// Only a decision is accepted — 'Pending' is the initial state, not something
// the console sets, so re-opening a decided registration isn't a valid action.
export const updateVerificationSchema = z.object({
  verificationStatus: z.enum(['Approved', 'Rejected']),
  verificationNote: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
