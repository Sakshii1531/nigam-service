import { z } from 'zod';
import { mediaUrl } from '../shared/mediaUrl.js';

export const listProductsQuerySchema = z.object({
  category: z.string().optional(),
  condition: z.enum(['New', 'Refurbished']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

// Admin list (Super Admin → NCC Products): inactive products included.
export const adminListProductsQuerySchema = listProductsQuerySchema.extend({
  status: z.enum(['active', 'inactive']).optional(),
  stock: z.enum(['in', 'low', 'out']).optional(),
  brand: z.string().optional(),
});

const text = (max) => z.string().trim().max(max);
const specGroup = z.object({
  group: text(60).min(1),
  items: z.array(z.object({ label: text(80).min(1), value: text(300).min(1) })).max(50),
});

export const createProductSchema = z
  .object({
    category: z.string().min(1),
    name: text(200).min(1),
    brand: text(80).optional(),
    modelNumber: text(80).optional(),
    colour: text(40).optional(),
    condition: z.enum(['New', 'Refurbished']).optional(),
    conditionGrade: z.string().optional(),
    originalPrice: z.coerce.number().nonnegative().optional(),
    price: z.coerce.number().nonnegative(),
    specs: z.array(text(120)).max(12).optional(),
    description: text(5000).optional(),
    specifications: z.array(specGroup).max(20).optional(),
    inTheBox: z.array(text(120)).max(30).optional(),
    warrantyMonths: z.coerce.number().int().nonnegative().optional(),
    warrantySummary: text(300).optional(),
    benefits: z.array(z.string()).optional(),
    returnDays: z.coerce.number().int().min(0).max(90).optional(),
    codAvailable: z.boolean().optional(),
    installationIncluded: z.boolean().optional(),
    manufacturer: text(300).optional(),
    countryOfOrigin: text(60).optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
    lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
    sku: z.string().optional(),
    imageUrl: mediaUrl().optional(),
    images: z.array(mediaUrl()).max(10).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((p) => p.originalPrice == null || p.originalPrice >= p.price, {
    message: 'MRP cannot be lower than the selling price',
    path: ['originalPrice'],
  });

export const updateProductSchema = createProductSchema.innerType().partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
