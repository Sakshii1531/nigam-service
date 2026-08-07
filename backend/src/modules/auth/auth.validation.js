import { z } from 'zod';
import { ROLES } from '../../config/constants.js';

const role = z.enum(Object.values(ROLES));
const identifier = z.string().min(3); // phone or email, deliberately not format-locked (matches frontend's single input)
const code = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');
const password = z.string().min(6);

export const loginSchema = z.object({ role, identifier, password });
export const otpSendSchema = z.object({ role, identifier, purpose: z.enum(['login', 'forgot_password', 'signup']).default('login') });
export const otpVerifySchema = z.object({ role, identifier, code });
export const forgotPasswordSchema = z.object({ role, identifier });
export const resetPasswordSchema = z.object({ role, identifier, code, newPassword: password });
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const logoutSchema = z.object({ refreshToken: z.string().min(1) });

export const signupCheckSchema = z.object({
  name: z.string().regex(/^[A-Za-z\s]+$/, 'Name must contain only alphabets and spaces').min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  address: z.string().min(1, 'Address is required'),
  referralCode: z.string().optional().nullable(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const signupVerifySchema = z.object({
  name: z.string().regex(/^[A-Za-z\s]+$/, 'Name must contain only alphabets and spaces').min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  address: z.string().min(1, 'Address is required'),
  referralCode: z.string().optional().nullable(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateOwnProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional(),
});
