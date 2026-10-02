import { z } from 'zod';

export const updateSettingsSchema = z.object({
  platformName: z.string().min(1).optional(),
  logoUrl: z.string().nullable().optional(),
  supportEmail: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  razorpayKeyId: z.string().optional(),
  defaultGstPercent: z.number().min(0).max(100).optional(),
  coinConversionRate: z.number().positive().optional(),
  referralBonusAmount: z.number().min(0).optional(),
  refereeDiscountPercent: z.number().min(0).max(100).optional(),
  defaultSparePartMarkupPercent: z.number().min(0).max(100).optional(),
  bookingAdvancePercent: z.number().min(0).max(100).optional(),
  visitFeeAmount: z.number().min(0).optional(),
  warrantySla: z
    .object({
      approvalHours: z.number().positive().max(24 * 90).optional(),
      assignmentHours: z.number().positive().max(24 * 90).optional(),
      visitHours: z.number().positive().max(24 * 90).optional(),
      resolutionHours: z.number().positive().max(24 * 90).optional(),
    })
    .optional(),
});
