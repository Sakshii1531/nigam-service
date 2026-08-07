import { z } from 'zod';

export const upsertCategoryConfigSchema = z.object({
  productTypes: z
    .array(z.object({ id: z.string().optional(), name: z.string().optional(), icon: z.string().optional(), desc: z.string().optional() }))
    .optional(),
  services: z.record(z.unknown()).optional(),
  brands: z.array(z.string()).optional(),
  whyBrandPoints: z.array(z.string()).optional(),
  categoryNote: z.string().optional(),
});

export const categoryNameParamSchema = z.object({ categoryName: z.string().min(1) });
