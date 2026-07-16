import { z } from 'zod';
import { ROLES } from '../../config/constants.js';

const role = z.enum(Object.values(ROLES));
const identifier = z.string().min(3); // phone or email, deliberately not format-locked (matches frontend's single input)
const code = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');
const password = z.string().min(6);

export const loginSchema = z.object({ role, identifier, password });
export const otpSendSchema = z.object({ role, identifier, purpose: z.enum(['login', 'forgot_password']).default('login') });
export const otpVerifySchema = z.object({ role, identifier, code });
export const forgotPasswordSchema = z.object({ role, identifier });
export const resetPasswordSchema = z.object({ role, identifier, code, newPassword: password });
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const logoutSchema = z.object({ refreshToken: z.string().min(1) });
