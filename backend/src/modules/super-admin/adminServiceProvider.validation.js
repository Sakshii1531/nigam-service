import { z } from 'zod';

export const listServiceProvidersQuerySchema = z.object({
  status: z.enum(['Active', 'Inactive', 'Pending']).optional(),
  availability: z.enum(['Available', 'Busy', 'Offline']).optional(),
  city: z.string().optional(),
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
