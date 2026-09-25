import { z } from 'zod';
import { mediaUrl } from '../shared/mediaUrl.js';
import { PART_UNITS } from './sparePartCatalog.model.js';

const text = (max) => z.string().trim().max(max);

export const createSparePartSchema = z.object({
  name: text(160).min(1),
  brand: text(80).optional(),
  code: text(80).optional(),
  costPrice: z.coerce.number().min(0),
  markupPercent: z.coerce.number().min(0).max(1000).optional(),
  gstPercent: z.coerce.number().min(0).max(28).optional(),
  hsnCode: text(20).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  category: text(60).optional(),
  compatibleCategories: z.array(text(60).min(1)).max(30).optional(),
  compatibleBrands: z.array(text(60).min(1)).max(50).optional(),
  compatibleModels: z.array(text(80).min(1)).max(100).optional(),
  description: text(3000).optional(),
  images: z.array(mediaUrl()).max(8).optional(),
  specifications: z.array(z.object({ label: text(80).min(1), value: text(200).min(1) })).max(40).optional(),
  unit: z.enum(PART_UNITS).optional(),
  warrantyMonths: z.coerce.number().int().min(0).max(120).optional(),
  reorderThreshold: z.coerce.number().int().min(0).optional(),
  supplier: text(120).optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  storageLocation: text(60).optional(),
  isActive: z.boolean().optional(),
});

// `stockReason` goes into the stock history when an edit changes the stock.
export const updateSparePartSchema = createSparePartSchema.partial().extend({ stockReason: text(200).optional() });

export const stockChangeSchema = z
  .object({
    type: z.enum(['RESTOCK', 'ADJUSTMENT', 'ISSUE']),
    quantity: z.coerce.number().int().refine((n) => n !== 0, 'Quantity cannot be 0'),
    reason: text(200).min(1, 'Give a reason'),
  })
  .refine((c) => c.type === 'ADJUSTMENT' || c.quantity > 0, { message: 'Restock and issue quantities are positive', path: ['quantity'] });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  stock: z.enum(['in', 'low', 'out']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
