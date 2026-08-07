import { z } from 'zod';

// `brand` is never accepted — the route always uses the caller's own.
export const updateBrandSettingsSchema = z.object({
  supportEmail: z.string().optional(),
  supportPhone: z.string().optional(),
  website: z.string().optional(),
  autoAssignTechnician: z.boolean().optional(),
  requireCompletionPhoto: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
});
