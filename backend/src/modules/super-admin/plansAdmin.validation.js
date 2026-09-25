import { z } from 'zod';

const text = (max) => z.string().trim().max(max);
const applianceCategory = z.string().trim().min(1).max(80).nullable();

export const idParamSchema = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id') });

const amcPlanFields = {
  name: text(120).min(2),
  tier: text(40).optional(),
  description: text(600).optional(),
  benefits: z.array(text(160).min(1)).max(20).optional(),
  price: z.number().min(0),
  visitsTotal: z.number().int().min(0).max(52),
  durationMonths: z.number().int().min(1).max(60).optional(),
  applianceCategory: applianceCategory.optional(),
  displayOrder: z.number().int().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

export const createAmcPlanSchema = z.object(amcPlanFields).strict();
export const updateAmcPlanSchema = z.object(amcPlanFields).partial().strict();

const ewPlanFields = {
  name: text(120).min(2),
  description: text(600).optional(),
  features: z.array(text(160).min(1)).max(20).optional(),
  price: z.number().min(0),
  durationYears: z.number().int().min(1).max(10),
  claimsTotal: z.number().int().min(0).max(50).optional(),
  applianceCategory: applianceCategory.optional(),
  displayOrder: z.number().int().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

export const createEwPlanSchema = z.object(ewPlanFields).strict();
export const updateEwPlanSchema = z.object(ewPlanFields).partial().strict();

