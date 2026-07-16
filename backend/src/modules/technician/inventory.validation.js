import { z } from 'zod';

export const placePartOrderSchema = z.object({
  job: z.string().optional(),
  partName: z.string().min(1),
  sku: z.string().optional(),
  qty: z.number().int().positive().default(1),
  price: z.number().min(0).optional(),
  orderSource: z.enum(['NCC Warehouse', 'Partner Brand', 'Nearby Store']),
});

export const listPartOrdersQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Dispatched', 'Rejected']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const partOrderIdParamSchema = z.object({ id: z.string().min(1) });
