import { z } from 'zod';

export const createMilestoneSchema = z.object({
  title: z.string().min(1),
  threshold: z.number().min(0),
  benefit: z.string().optional(),
  status: z.enum(['Locked', 'Unlocked']).optional(),
});
export const updateMilestoneSchema = createMilestoneSchema.partial();

export const createMembershipSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  benefits: z.array(z.string()).optional(),
  tierRank: z.number().int().positive(),
});
export const updateMembershipSchema = createMembershipSchema.partial();

const segmentSchema = z.object({ label: z.string().min(1), probability: z.number().min(0).max(100), reward: z.string().optional() });
export const updateSpinWheelSchema = z.object({
  segments: z.array(segmentSchema).optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
