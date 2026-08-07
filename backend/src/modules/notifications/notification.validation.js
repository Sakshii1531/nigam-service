import { z } from 'zod';

export const listQuerySchema = z.object({
  // z.coerce.boolean() uses JS's Boolean(str) under the hood — Boolean("false")
  // is true (any non-empty string is truthy), so it would silently invert the
  // filter for ?read=false. Parse the literal query-string values instead.
  read: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const updatePreferencesSchema = z.object({
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  email: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  bookingUpdates: z.boolean().optional(),
  whatsAppPromo: z.boolean().optional(),
  emailPromo: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
});

export const deviceTokenSchema = z.object({
  token: z.string().min(1, 'FCM device token is required'),
});

// Ad-hoc admin dispatch. `recipientId` and `broadcastRole` are mutually
// exclusive — the service enforces that one and only one is present.
export const adHocPushSchema = z.object({
  recipientId: z.string().min(1).optional(),
  broadcastRole: z.enum(['All', 'Technicians', 'Brands', 'Customers']).optional(),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  type: z
    .enum(['assigned', 'created', 'payment', 'completed', 'jobs', 'claims', 'payments', 'service', 'tech', 'dispatch', 'promo'])
    .optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  cta: z.object({ label: z.string(), route: z.string() }).optional(),
});

export const adHocSmsSchema = z.object({
  recipientId: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  message: z.string().min(1, 'Message is required'),
  templateId: z.string().optional(),
  // Accepted for forward-compat with the console's payload; SMSIndiaHub is the
  // only wired provider, so it is not branched on yet.
  provider: z.string().optional(),
});
