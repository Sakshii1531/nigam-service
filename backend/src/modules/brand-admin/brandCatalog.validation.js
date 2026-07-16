import { z } from 'zod';

export const createMasterServiceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['Installation', 'Repair', 'Maintenance', 'Inspection', 'Finishing']),
  charge: z.number().min(0),
});

export const updateMasterServiceSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['Installation', 'Repair', 'Maintenance', 'Inspection', 'Finishing']).optional(),
  charge: z.number().min(0).optional(),
});

export const createSubBrandSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
});

export const updateSubBrandSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
});

export const createBrandProductSchema = z.object({
  name: z.string().min(1),
  model: z.string().optional(),
  services: z.array(z.string()).optional(),
});

export const updateBrandProductSchema = z.object({
  name: z.string().min(1).optional(),
  model: z.string().optional(),
  services: z.array(z.string()).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
export const subBrandIdParamSchema = z.object({ subBrandId: z.string().min(1) });
