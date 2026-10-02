import { z } from 'zod';
import { mediaUrl } from '../shared/mediaUrl.js';

export const createBannerSchema = z.object({
  imageUrl: mediaUrl().pipe(z.string().min(1)),
  title: z.string().optional(),
  description: z.string().optional(),
  segment: z.enum(['warranty', 'non-warranty']).optional(),
  app: z.enum(['customer', 'service_provider']).optional(),
  sortOrder: z.number().optional(),
});
export const updateBannerSchema = createBannerSchema.partial().extend({ isActive: z.boolean().optional() });
export const listBannersQuerySchema = z.object({ app: z.enum(['customer', 'service_provider']).optional() });

const storySlideSchema = z.object({
  image: mediaUrl().optional(),
  caption: z.string().optional(),
  subCaption: z.string().optional(),
});

export const createStorySchema = z.object({
  title: z.string().min(1),
  type: z.enum(['Promo Banner', 'Customer Help Slider', 'Informational']),
  mediaUrl: mediaUrl().optional(),
  aspectRatio: z.string().optional(),
  slides: z.array(storySlideSchema).optional(),
  target: z
    .object({ productType: z.string().regex(/^[a-f0-9]{24}$/i).nullable().optional(), service: z.string().regex(/^[a-f0-9]{24}$/i) })
    .nullable()
    .optional(),
  status: z.enum(['Active', 'Scheduled']).optional(),
});
export const updateStorySchema = createStorySchema.partial();

export const createVideoSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  // A published lesson without playable media produces a dead card in the
  // partner app. New rows therefore require a URL; legacy rows can still be
  // edited/deactivated through the partial update schema below.
  url: mediaUrl().pipe(z.string().min(1)),
  duration: z.string().optional(),
  sizeBytes: z.number().optional(),
});
export const updateVideoSchema = createVideoSchema.partial().extend({ isActive: z.boolean().optional() });

const advertisementFieldsSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['App Header Banner', 'Category Popup', 'Cart Bottom Banner']),
  title: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  imageUrl: mediaUrl().optional(),
  actionUrl: z.string().max(2048).optional(),
  buttonText: z.string().max(80).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  textColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  budget: z.number().min(0).optional(),
  status: z.enum(['Running', 'Paused']).optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const validateAdvertisementDates = (data, ctx) => {
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End date must be after the start date' });
  }
};

export const createAdvertisementSchema = advertisementFieldsSchema.superRefine(validateAdvertisementDates);
export const updateAdvertisementSchema = advertisementFieldsSchema.partial().superRefine(validateAdvertisementDates);

export const listAdvertisementsQuerySchema = z.object({
  type: z.enum(['App Header Banner', 'Category Popup', 'Cart Bottom Banner']).optional(),
});

export const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().optional(),
});

export const sectionItemSchema = z.object({
  heading: z.string().min(1),
  text: z.string().min(1),
  order: z.number().optional(),
});

export const statItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const upsertCmsPageSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  version: z.string().optional(),
  contactEmail: z.string().optional(),
  stats: z.array(statItemSchema).optional(),
  sections: z.array(sectionItemSchema).optional(),
  faqs: z.array(faqItemSchema).optional(),
  publishedAt: z.coerce.date().optional(),
});
export const slugParamSchema = z.object({ slug: z.string().min(1) });

export const setAppSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});
const normalizeAppName = (value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized === 'serviceprovider' ? 'service_provider' : normalized;
};

// Keep the old serviceProvider/service-provider spellings readable while all
// new rows use the enum value stored by AppSetting.
export const appParamSchema = z.object({
  app: z.preprocess(normalizeAppName, z.enum(['customer', 'service_provider'])),
});

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
