import { z } from 'zod';

// Kept as free-form strings rather than a fixed z.enum — asm.service.js's
// syncAsmRole just ignores any key that doesn't resolve to a real Permission,
// so this schema doesn't need editing every time a permission is added.
const permissionsField = z.array(z.string()).optional();

export const createAsmSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().min(1),
  // The ASM's login is created alongside the profile — see asm.service.js's
  // createAsm — so a password is required, not optional, on create. It's a
  // temporary credential (mustChangePassword forces a real one on first login).
  password: z.string().min(6),
  permissions: permissionsField,
});

export const updateAsmSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  // Optional — only present when the super-admin is resetting this ASM's
  // (again temporary) password.
  password: z.string().min(6).optional(),
  permissions: permissionsField,
});

export const listQuerySchema = z.object({ city: z.string().optional() });

export const idParamSchema = z.object({ id: z.string().min(1) });
