import { z } from 'zod';

export const createBannerSchema = z.object({
  imageUrl: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  segment: z.enum(['warranty', 'non-warranty']).optional(),
  app: z.enum(['customer', 'technician']).optional(),
  sortOrder: z.number().optional(),
});
export const updateBannerSchema = createBannerSchema.partial().extend({ isActive: z.boolean().optional() });
export const listBannersQuerySchema = z.object({ app: z.enum(['customer', 'technician']).optional() });

const storySlideSchema = z.object({
  image: z.string().optional(),
  caption: z.string().optional(),
  subCaption: z.string().optional(),
});

export const createStorySchema = z.object({
  title: z.string().min(1),
  type: z.enum(['Promo Banner', 'Customer Help Slider', 'Informational']),
  mediaUrl: z.string().optional(),
  aspectRatio: z.string().optional(),
  slides: z.array(storySlideSchema).optional(),
});
export const updateStorySchema = createStorySchema.partial().extend({ status: z.enum(['Active', 'Scheduled']).optional() });

export const createVideoSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
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

export const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().optional(),
});

export const upsertCmsPageSchema = z.object({
  body: z.string().optional(),
  faqs: z.array(faqItemSchema).optional(),
  publishedAt: z.coerce.date().optional(),
});
export const slugParamSchema = z.object({ slug: z.string().min(1) });

export const setAppSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});
export const appParamSchema = z.object({ app: z.enum(['customer', 'technician']) });

export const idParamSchema = z.object({ id: z.string().min(1) });

// Console list filters. Unlike the public readers these do not force a publish
// state, so an omitted `status` means "every row, live or not".
export const adminListStoriesQuerySchema = z.object({
  status: z.enum(['Active', 'Scheduled']).optional(),
});
export const adminListAdvertisementsQuerySchema = z.object({
  status: z.enum(['Running', 'Paused']).optional(),
});

export const createAnnouncementSchema = z.object({
  message: z.string().min(1),
  severity: z.enum(['Info', 'Warning', 'Critical']).optional(),
  scope: z.enum(['all', 'city', 'role']).optional(),
  region: z.string().optional(),
});
export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const createSkillSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  group: z.string().optional(),
});
export const updateSkillSchema = createSkillSchema.partial().extend({ isActive: z.boolean().optional() });
