import { z } from 'zod';

const pagination = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
};

export const listCustomersQuerySchema = z.object({
  search: z.string().optional(),
  ...pagination,
});

export const listPaginatedQuerySchema = z.object({ ...pagination });

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
  status: z.enum(['Pending', 'Approved', 'Dispatched', 'Rejected']).optional(),
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
