import { z } from 'zod';

export const createMilestoneSchema = z.object({
  title: z.string().min(1),
  threshold: z.number().min(0),
  benefit: z.string().optional(),
  status: z.enum(['Locked', 'Unlocked']).optional(),
});
export const updateMilestoneSchema = createMilestoneSchema.partial();

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

// The whole Rewards Program, saved from the super admin's Rewards Program page.
const money = z.coerce.number().min(0).max(100000);
export const updateRewardsProgramSchema = z
  .object({
    isActive: z.boolean(),
    earning: z.object({ coinsPer100: money, xpPer100: money }).strict(),
    levels: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(40),
            xpRequired: z.coerce.number().int().min(0).max(10000000),
            dailySpins: z.coerce.number().int().min(0).max(50),
            perks: z.string().trim().max(200).default(''),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    tasks: z
      .array(
        z
          .object({
            key: z.enum(['book_service', 'write_review', 'refer_friend']),
            title: z.string().trim().min(1).max(60),
            hint: z.string().trim().max(120).default(''),
            coins: z.coerce.number().int().min(0).max(100000),
            xp: z.coerce.number().int().min(0).max(100000),
            isActive: z.boolean(),
          })
          .strict(),
      )
      .max(3),
    partnerBadges: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(30),
            minJobs: z.coerce.number().int().min(0).max(1000000),
            color: z.string().trim().max(20).default(''),
          })
          .strict(),
      )
      .min(1)
      .max(15),
    spinWheel: z
      .object({
        isActive: z.boolean(),
        xpPerSpin: z.coerce.number().int().min(0).max(10000),
        segments: z
          .array(
            z
              .object({
                label: z.string().trim().min(1).max(24),
                prizeType: z.enum(['coins', 'spin', 'none']),
                value: z.coerce.number().int().min(0).max(100000),
                probability: z.coerce.number().min(0).max(100),
                color: z.string().trim().max(20).default(''),
              })
              .strict(),
          )
          .max(12),
      })
      .strict(),
  })
  .strict();
