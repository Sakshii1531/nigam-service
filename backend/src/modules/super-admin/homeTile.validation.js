import { z } from 'zod';
import { mediaUrl } from '../shared/mediaUrl.js';

const PLACEMENTS = ['category', 'dashboard-service', 'most-booked', 'appliance-service', 'brand-card'];

export const listTilesQuerySchema = z.object({
  placement: z.enum(PLACEMENTS).optional(),
});

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

// A tile's link is followed by every customer who taps it. It must be an in-app
// path or a plain web address — never "javascript:", "data:" or a protocol-
// relative "//host" — and empty is allowed (a tile that goes nowhere).
const link = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^\/(?!\/)\S*$/.test(v) || /^https?:\/\/\S+$/i.test(v), {
    message: 'Link must be an in-app path starting with "/" or a full http(s):// address',
  });
// Tailwind gradient classes written by the console's theme presets.
const gradient = z.string().trim().max(120).regex(/^[A-Za-z0-9\-\[\]#/_. ]*$/, 'Invalid colour theme');
const hexColour = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must look like #0D47A1');
const SERVICE_PLACEMENTS = ['most-booked', 'appliance-service'];

const tileFields = z.object({
  placement: z.enum(PLACEMENTS),
  // Optional for service tiles — it defaults to the service's own name.
  title: z.string().trim().max(80).optional(),
  target: z.object({ productType: objectId.nullable().optional(), service: objectId }).optional(),
  imageUrl: mediaUrl().nullable().optional(),
  icon: mediaUrl().optional(),
  link: link.optional(),
  service: z.string().optional(),
  brandName: z.string().trim().max(40).optional(),
  subtitle: z.string().trim().max(120).optional(),
  buttonText: z.string().trim().max(30).optional(),
  badgeText: z.string().trim().max(30).optional(),
  gradient: gradient.optional(),
  textColor: hexColour.optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// A service tile must say which bookable service it is; other tiles need a title.
export const createTileSchema = tileFields
  .refine((t) => !SERVICE_PLACEMENTS.includes(t.placement) || t.target, { message: 'Pick the service this tile books', path: ['target'] })
  .refine((t) => SERVICE_PLACEMENTS.includes(t.placement) || t.title, { message: 'Title is required', path: ['title'] })
  .refine((t) => t.placement !== 'brand-card' || t.brandName, { message: 'Brand name is required', path: ['brandName'] });

// A brand card cannot be saved without its brand or its headline.
export const updateTileSchema = tileFields.partial().refine((t) => t.brandName === undefined || t.brandName !== '', { message: 'Brand name is required', path: ['brandName'] });

// Saves a whole row's order in one call (ids top to bottom).
export const reorderTilesSchema = z.object({ placement: z.enum(PLACEMENTS), ids: z.array(objectId).min(1).max(100) });


export const idParamSchema = z.object({ id: z.string().min(1) });
