import { z } from 'zod';

const pagination = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
};

export const listPaginatedQuerySchema = z.object({ ...pagination });

export const listCompletionsQuerySchema = z.object({
  ...pagination, q: z.string().trim().max(100).optional(),
  tab: z.enum(['all', 'today', 'pending_qc', 'feedback_pending']).optional(),
  format: z.literal('csv').optional(),
}).strict();

export const listWarrantyQuerySchema = z.object({
  verificationStatus: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  ...pagination,
});

export const listAmcQuerySchema = z.object({
  status: z.enum(['Active', 'Expiring Soon', 'Expired']).optional(),
  ...pagination,
});

export const listClaimsQuerySchema = z.object({
  status: z.enum(['Pending Approval', 'Approved', 'Rejected']).optional(),
  ...pagination,
});

export const listPartOrdersQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Ready to Hand Over', 'Handed Over', 'Dispatched', 'Delivered', 'Rejected']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const listPaymentsQuerySchema = z.object({
  status: z.enum(['Pending', 'Success', 'Failed', 'Refunded']).optional(),
  ...pagination,
});

export const listPayoutsQuerySchema = z.object({
  status: z.enum(['Settled', 'Pending']).optional(),
  ...pagination,
});
