import { z } from 'zod';
import { mediaUrl } from '../shared/mediaUrl.js';

const PLACEMENTS = ['category', 'dashboard-service', 'most-booked', 'appliance-service', 'brand-card'];

export const listTilesQuerySchema = z.object({
  placement: z.enum(PLACEMENTS).optional(),
});

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const SERVICE_PLACEMENTS = ['most-booked', 'appliance-service'];

const tileFields = z.object({
  placement: z.enum(PLACEMENTS),
  // Optional for service tiles — it defaults to the service's own name.
  title: z.string().trim().max(80).optional(),
  target: z.object({ productType: objectId.nullable().optional(), service: objectId }).optional(),
  imageUrl: mediaUrl().nullable().optional(),
  icon: mediaUrl().optional(),
  link: z.string().optional(),
  service: z.string().optional(),
  brandName: z.string().optional(),
  subtitle: z.string().optional(),
  buttonText: z.string().optional(),
  badgeText: z.string().optional(),
  gradient: z.string().optional(),
  textColor: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// A service tile must say which bookable service it is; other tiles need a title.
export const createTileSchema = tileFields
  .refine((t) => !SERVICE_PLACEMENTS.includes(t.placement) || t.target, { message: 'Pick the service this tile books', path: ['target'] })
  .refine((t) => SERVICE_PLACEMENTS.includes(t.placement) || t.title, { message: 'Title is required', path: ['title'] });

export const updateTileSchema = tileFields.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
