import { z } from 'zod';
import { mediaUrl } from '../shared/mediaUrl.js';

export const createReviewSchema = z.object({
  serviceRequest: z.string().min(1),
  rating: z.number().min(1).max(5),
  categoryRatings: z
    .object({
      overall: z.number().min(1).max(5).optional(),
      serviceProviderBehavior: z.number().min(1).max(5).optional(),
      serviceQuality: z.number().min(1).max(5).optional(),
      timeliness: z.number().min(1).max(5).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  photos: z.array(mediaUrl()).optional(),
  tip: z.number().min(0).optional(),
  comment: z.string().optional(),
});

export const respondSchema = z.object({ response: z.string().min(1) });

export const idParamSchema = z.object({ id: z.string().min(1) });

export const serviceProviderIdParamSchema = z.object({ serviceProviderId: z.string().min(1) });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const brandListQuerySchema = listQuerySchema.extend({
  status: z.enum(['Reviewed', 'Responded', 'Escalated']).optional(),
});

const featuredReviewFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  comment: z.string().trim().min(1).max(1000),
  rating: z.number().min(1).max(5),
  authorName: z.string().trim().min(1).max(120),
  theme: z.enum(['pink', 'purple', 'teal', 'amber']),
  isVisible: z.boolean(),
  approvalStatus: z.enum(['Approved', 'Rejected']).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createFeaturedReviewSchema = featuredReviewFieldsSchema;
export const updateFeaturedReviewSchema = featuredReviewFieldsSchema.partial();
