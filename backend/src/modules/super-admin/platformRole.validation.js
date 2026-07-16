import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1),
  permissionKeys: z.array(z.string()).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});
export const updateRoleSchema = createRoleSchema.partial();
export const idParamSchema = z.object({ id: z.string().min(1) });
