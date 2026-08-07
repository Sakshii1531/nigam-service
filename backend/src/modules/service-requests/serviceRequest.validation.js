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

// Brand-admin's RegisterComplaint screen: an agent logging a complaint on a
// customer's behalf. `user` is required because the agent is not the customer;
// `brand` is never accepted from the body — the route forces the caller's own.
export const createServiceRequestSchema = z.object({
  user: z.string().min(1),
  category: z.string().min(1),
  model: z.string().optional(),
  serialNo: z.string().optional(),
  complaintType: z
    .enum(['Breakdown', 'No Power', 'Noise', 'Performance', 'Physical Damage', 'Intermittent'])
    .optional(),
  description: z.string().optional(),
  priority: z.enum(['Critical', 'High', 'P1', 'P2', 'Medium', 'P3', 'Low']).optional(),
  warranty: z.enum(['In Warranty', 'Out of Warranty']).optional(),
  invoiceAvailable: z.boolean().optional(),
  brandTicketNo: z.string().optional(),
  zone: z.string().optional(),
});

// Manual assignment from the super-admin console. `technician` is optional so a
// blank body means "let the weighted engine pick" — the same engine the auto
// path uses, rather than a second ranking implementation on the client.
export const assignSchema = z.object({
  technician: z.string().min(1).optional(),
});
