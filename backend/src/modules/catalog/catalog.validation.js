import { z } from 'zod';

export const createCategorySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  lightBg: z.string().optional(),
  categoryNote: z.string().optional(),
  brands: z.array(z.string()).optional(),
  whyBrandPoints: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  section: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().omit({ key: true });

export const categoryKeyParamSchema = z.object({ key: z.string().min(1) });

export const addProductTypeSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  desc: z.string().optional(),
  priceAddon: z.coerce.number().min(0).optional(),
});

export const updateProductTypeSchema = addProductTypeSchema.partial().omit({ slug: true });

export const addServiceItemSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  desc: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  unit: z.string().optional(),
});

export const updateServiceItemSchema = addServiceItemSchema.partial().omit({ slug: true }).extend({
  isActive: z.boolean().optional(),
});

export const productTypeIdParamSchema = z.object({ key: z.string().min(1), productTypeId: z.string().min(1) });
export const serviceItemIdParamSchema = z.object({ key: z.string().min(1), serviceItemId: z.string().min(1) });
