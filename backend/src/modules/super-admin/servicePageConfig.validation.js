import { z } from 'zod';

const catalogItemSchema = z.object({
  name: z.string().min(1),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().min(0).optional(),
  price: z.string().optional(),
  time: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

const catalogSectionSchema = z.object({
  section: z.string().min(1),
  items: z.array(catalogItemSchema).optional(),
});

// serviceKey comes from the URL on upsert, never the body — so a caller cannot
// write one service's config under another's key.
export const upsertServicePageConfigSchema = z.object({
  tagline: z.string().optional(),
  subtitle: z.string().optional(),
  subServices: z.string().optional(),
  catalog: z.array(catalogSectionSchema).optional(),
});

export const serviceKeyParamSchema = z.object({ serviceKey: z.string().min(1) });
