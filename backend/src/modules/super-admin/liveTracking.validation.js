import { z } from 'zod';

export const upsertTrackingSchema = z.object({
  job: z.string().min(1),
  technician: z.string().min(1),
  status: z.enum(['On the way', 'Repairing', 'Completed']).optional(),
  eta: z.string().optional(),
  location: z.string().optional(),
  coords: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export const jobIdParamSchema = z.object({ jobId: z.string().min(1) });
