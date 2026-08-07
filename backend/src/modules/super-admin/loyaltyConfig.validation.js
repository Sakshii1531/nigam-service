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

const segmentSchema = z.object({
  label: z.string().min(1),
  probability: z.number().min(0).max(100),
  winningType: z.enum(['money', 'coins', 'spin', 'none']).optional(),
  value: z.number().min(0).optional(),
  reward: z.string().optional(),
});
export const updateSpinWheelSchema = z.object({
  segments: z.array(segmentSchema).optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const createReferralCampaignSchema = z.object({
  name: z.string().min(1),
  bonus: z.coerce.number().nonnegative().optional(),
  discount: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});
export const updateReferralCampaignSchema = createReferralCampaignSchema.partial();
