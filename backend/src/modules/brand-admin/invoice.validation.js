import { z } from 'zod';

export const createInvoiceSchema = z.object({
  serviceRequest: z.string().min(1),
  customer: z.string().min(1),
  technician: z.string().optional(),
  product: z.string().optional(),
  serviceCharge: z.number().min(0).optional(),
  partCharge: z.number().min(0).optional(),
  gst: z.number().min(0).optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['Paid', 'Pending', 'Failed']),
});

export const listInvoicesQuerySchema = z.object({
  status: z.enum(['Paid', 'Pending', 'Failed']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
