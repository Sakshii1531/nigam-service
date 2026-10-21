import { z } from 'zod';
import { SERVICE_REQUEST_STATUS } from '../../config/constants.js';

export const transitionSchema = z.object({
  status: z.enum(SERVICE_REQUEST_STATUS),
  description: z.string().optional(),
});

export const listServiceRequestsQuerySchema = z.object({
  serviceProvider: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid service provider ID').optional(),
  status: z.enum(SERVICE_REQUEST_STATUS).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

// Manual assignment from the super-admin console. `service provider` is optional so a
// blank body means "let the weighted engine pick" — the same engine the auto
// path uses, rather than a second ranking implementation on the client.
export const assignSchema = z.object({
  serviceProvider: z.string().min(1).optional(),
});
