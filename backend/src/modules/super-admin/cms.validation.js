import { z } from 'zod';

export const createBannerSchema = z.object({
  imageUrl: z.string().min(1),
  segment: z.enum(['warranty', 'non-warranty']).optional(),
  app: z.enum(['customer', 'technician']).optional(),
  sortOrder: z.number().optional(),
});
export const updateBannerSchema = createBannerSchema.partial().extend({ isActive: z.boolean().optional() });
export const listBannersQuerySchema = z.object({ app: z.enum(['customer', 'technician']).optional() });

export const createStorySchema = z.object({
  title: z.string().min(1),
  type: z.enum(['Promo Banner', 'Customer Help Slider', 'Informational']),
  mediaUrl: z.string().optional(),
  aspectRatio: z.string().optional(),
});
export const updateStorySchema = createStorySchema.partial().extend({ status: z.enum(['Active', 'Scheduled']).optional() });

export const createVideoSchema = z.object({
  title: z.string().min(1),
  url: z.string().optional(),
  duration: z.string().optional(),
  sizeBytes: z.number().optional(),
});
export const updateVideoSchema = createVideoSchema.partial().extend({ isActive: z.boolean().optional() });

export const createAdvertisementSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['App Header Banner', 'Category Popup', 'Cart Bottom Banner']),
  budget: z.number().optional(),
});
export const updateAdvertisementSchema = createAdvertisementSchema.partial().extend({ status: z.enum(['Running', 'Paused']).optional() });

export const upsertCmsPageSchema = z.object({
  body: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
});
export const slugParamSchema = z.object({ slug: z.string().min(1) });

export const setAppSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});
export const appParamSchema = z.object({ app: z.enum(['customer', 'technician']) });

export const idParamSchema = z.object({ id: z.string().min(1) });
