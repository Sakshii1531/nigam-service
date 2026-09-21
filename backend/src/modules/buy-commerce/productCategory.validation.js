import { z } from 'zod';

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

export const createProductCategorySchema = z
  .object({
    name:      z.string().min(1).max(80),
    slug:      z.string().min(1).max(80).optional(), // auto-generated when omitted
    icon:      z.string().optional(),
    sortOrder: z.coerce.number().int().nonnegative().optional(),
    isActive:  z.boolean().optional(),
  })
  .transform((d) => ({ ...d, slug: d.slug ?? slugify(d.name) }));

export const updateProductCategorySchema = z
  .object({
    name:      z.string().min(1).max(80).optional(),
    slug:      z.string().min(1).max(80).optional(),
    icon:      z.string().optional(),
    sortOrder: z.coerce.number().int().nonnegative().optional(),
    isActive:  z.boolean().optional(),
  })
  .transform((d) => {
    if (d.name && !d.slug) d.slug = slugify(d.name);
    return d;
  });

export const idParamSchema = z.object({ id: z.string().min(1) });

