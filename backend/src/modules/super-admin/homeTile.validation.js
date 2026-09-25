import { z } from 'zod';
import { mediaUrl } from '../shared/mediaUrl.js';

const PLACEMENTS = ['category', 'dashboard-service', 'most-booked', 'appliance-service', 'brand-card'];

export const listTilesQuerySchema = z.object({
  placement: z.enum(PLACEMENTS).optional(),
});

export const createTileSchema = z.object({
  placement: z.enum(PLACEMENTS),
  title: z.string().min(1),
  imageUrl: mediaUrl().optional(),
  icon: mediaUrl().optional(),
  rating: z.number().min(0).max(5).optional(),
  badge: z.string().optional(),
  link: z.string().optional(),
  service: z.string().optional(),
  brandName: z.string().optional(),
  subtitle: z.string().optional(),
  buttonText: z.string().optional(),
  badgeText: z.string().optional(),
  gradient: z.string().optional(),
  textColor: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const updateTileSchema = createTileSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
