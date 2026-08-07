import { z } from 'zod';

const GATEWAYS = ['UPI', 'Card', 'NetBanking'];
const STATUSES = ['Success', 'Failed', 'Refunded'];

export const listTransactionsQuerySchema = z.object({
  gateway: z.enum(GATEWAYS).optional(),
  status: z.enum(STATUSES).optional(),
  customer: z.string().optional(),
  // Matches the gateway reference exactly — this is a reconciliation lookup,
  // not a fuzzy search.
  ref: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const createTransactionSchema = z.object({
  ref: z.string().min(1),
  customer: z.string().min(1),
  amount: z.number().positive(),
  gateway: z.enum(GATEWAYS),
  status: z.enum(STATUSES).optional(),
  payment: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
