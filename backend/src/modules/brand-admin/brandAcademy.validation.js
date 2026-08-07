import { z } from 'zod';

export const createGuideSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['PDF', 'Video']),
  product: z.string().optional(),
  url: z.string().optional(),
});

export const createCourseSchema = z.object({
  name: z.string().min(1),
  modules: z.array(z.string()).optional(),
  testRequired: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  status: z.enum(['Active', 'Draft']).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
