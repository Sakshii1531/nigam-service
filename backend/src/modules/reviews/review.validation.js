import { z } from 'zod';

export const createReviewSchema = z.object({
  serviceRequest: z.string().min(1),
  rating: z.number().min(1).max(5),
  categoryRatings: z
    .object({
      overall: z.number().min(1).max(5).optional(),
      technicianBehavior: z.number().min(1).max(5).optional(),
      serviceQuality: z.number().min(1).max(5).optional(),
      timeliness: z.number().min(1).max(5).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  tip: z.number().min(0).optional(),
  comment: z.string().optional(),
});

export const respondSchema = z.object({ response: z.string().min(1) });

export const idParamSchema = z.object({ id: z.string().min(1) });

export const technicianIdParamSchema = z.object({ technicianId: z.string().min(1) });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const brandListQuerySchema = listQuerySchema.extend({
  status: z.enum(['Reviewed', 'Responded', 'Escalated']).optional(),
});
