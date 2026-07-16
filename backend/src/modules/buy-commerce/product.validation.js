import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  category: z.string().optional(),
  condition: z.enum(['New', 'Refurbished']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const createProductSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  condition: z.enum(['New', 'Refurbished']).optional(),
  conditionGrade: z.string().optional(),
  originalPrice: z.coerce.number().nonnegative().optional(),
  price: z.coerce.number().nonnegative(),
  specs: z.array(z.string()).optional(),
  warrantyMonths: z.coerce.number().int().nonnegative().optional(),
  benefits: z.array(z.string()).optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  sku: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
