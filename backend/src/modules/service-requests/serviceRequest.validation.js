import { z } from 'zod';
import { SERVICE_REQUEST_STATUS } from '../../config/constants.js';

export const transitionSchema = z.object({
  status: z.enum(SERVICE_REQUEST_STATUS),
  description: z.string().optional(),
});

export const listServiceRequestsQuerySchema = z.object({
  status: z.enum(SERVICE_REQUEST_STATUS).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
