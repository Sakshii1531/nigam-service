import { z } from 'zod';

export const createAsmSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().min(1),
  // The ASM's login is created alongside the profile — see asm.service.js's
  // createAsm — so a password is required, not optional, on create.
  password: z.string().min(6),
});

export const updateAsmSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  // Optional — only present when the super-admin is resetting this ASM's password.
  password: z.string().min(6).optional(),
});

export const listQuerySchema = z.object({ city: z.string().optional() });

export const idParamSchema = z.object({ id: z.string().min(1) });
