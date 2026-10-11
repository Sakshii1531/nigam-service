import { z } from 'zod';
import { normalisePhone } from '../shared/phone.js';
const phone = z.string().transform(normalisePhone);
export const addressSchema = z.object({
  type: z.enum(['Home', 'Work', 'Other']).default('Home'),
  name: z.string().trim().max(100).optional(),
  house: z.string().trim().min(1).max(300),
  landmark: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().regex(/^\d{6}$/),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
}).strict();
const editable = {
  name: z.string().trim().min(1).max(100),
  email: z.union([z.string().trim().email().toLowerCase(), z.literal('')]).optional(),
  alternatePhone: z.string().transform(value => value ? normalisePhone(value) : '').optional(),
};
export const createCustomerSchema = z.object({ ...editable, phone, address: addressSchema.optional() }).strict();
export const updateCustomerSchema = z.object({ ...editable, name: editable.name.optional(), addresses: z.array(addressSchema).max(20).optional() }).strict().refine(v => Object.keys(v).length > 0, 'Provide an editable field');
export const listCustomerSchema = z.object({
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  format: z.enum(['csv']).optional(),
});
export const searchCustomerSchema = z.object({ phone });
