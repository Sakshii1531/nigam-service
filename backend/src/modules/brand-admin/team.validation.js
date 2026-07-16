import { z } from 'zod';

const DEPARTMENTS = ['Field Service', 'QA', 'Remote Support', 'Installation'];

export const createTeamSchema = z.object({
  name: z.string().min(1),
  department: z.enum(DEPARTMENTS),
  lead: z.string().optional(),
  region: z.string().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  lead: z.string().optional(),
  region: z.string().optional(),
});

export const memberSchema = z.object({ userId: z.string().min(1) });

export const idParamSchema = z.object({ id: z.string().min(1) });

// Must list every dynamic segment the route pattern declares — validate()'s
// `req[source] = result.data` replaces req.params wholesale, so a schema missing
// `userId` here would silently strip it from req.params (Zod drops unknown keys
// by default), not just fail to validate it.
export const memberParamSchema = z.object({ id: z.string().min(1), userId: z.string().min(1) });
