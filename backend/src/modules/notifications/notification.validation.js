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
  email: z.boolean().optional(),
});
