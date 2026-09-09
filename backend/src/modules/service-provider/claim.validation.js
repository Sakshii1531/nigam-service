import { z } from 'zod';

export const raiseClaimSchema = z.object({
  serviceRequest: z.string().min(1).optional(),
  brand: z.string().min(1),
  claimType: z.enum(['Brand', 'Extended Warranty', 'D2C', 'Warehouse Order']),
  item: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().optional(),
});

export const listClaimsQuerySchema = z.object({
  status: z.enum(['Pending Approval', 'Approved', 'Rejected']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const claimIdParamSchema = z.object({ id: z.string().min(1) });
