import { z } from 'zod';

export const listServiceProvidersQuerySchema = z.object({
  status: z.enum(['Active', 'Inactive', 'Pending']).optional(),
  availability: z.enum(['Available', 'Busy', 'Offline']).optional(),
  city: z.string().optional(),
  // Filters to whichever zone this ASM owns — resolved to a city server-side
  // (adminServiceProvider.service.js), since the relationship is derived, not stored.
  asm: z.string().optional(),
  // Free-text match across name / phone / email — what the console's search box sends.
  search: z.string().optional(),
  // Matches a single entry of the service provider's `specs` array.
  spec: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const updateServiceProviderStatusSchema = z.object({
  status: z.enum(['Active', 'Inactive', 'Pending']),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const changeServiceProviderCitySchema = z.object({
  cityId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid city id'),
  reason: z.string().trim().max(500).optional(),
});

export const listCityChangeRequestsQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const reviewCityChangeSchema = z.object({
  note: z.string().trim().max(500).optional(),
});
