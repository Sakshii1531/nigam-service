import { z } from 'zod';
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID');

export const createReturnSchema = z.object({
  serviceProvider: objectId,
  partName: z.string().min(1),
  sku: z.string().optional(),
  serviceRequest: objectId.optional(),
  replaceDate: z.coerce.date().optional(),
});

export const updateReturnSchema = z.object({
  status: z.enum(['Pending Verification', 'Verified & Scrapped', 'Transit Damaged', 'Pending Return Shipment']).optional(),
  transitStatus: z.enum(['Replaced', 'In Transit', 'Delivered']).optional(),
  trackingNo: z.string().optional(),
  damageFlag: z.boolean().optional(),
});

export const listQuerySchema = z.object({
  status: z.enum(['Pending Verification', 'Verified & Scrapped', 'Transit Damaged', 'Pending Return Shipment']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: objectId });
