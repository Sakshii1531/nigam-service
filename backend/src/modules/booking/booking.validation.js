import { z } from 'zod';

const addressSchema = z.object({
  type: z.enum(['Home', 'Work', 'Other']).optional(),
  house: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  name: z.string().optional(),
});

const timeSlotSchema = z.object({ date: z.string(), time: z.string() });

export const createBookingSchema = z.object({
  category: z.string().min(1),
  productType: z.string().optional(),
  serviceSlug: z.string().min(1),
  brand: z.string().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  scheduledDate: z.coerce.date().optional(),
  timeSlot: timeSlotSchema.optional(),
  address: addressSchema.optional(),
  fullName: z.string().optional(),
  mobile: z.string().optional(),
  paymentMode: z.enum(['advance', 'after']).optional(),
  // How the advance is collected. 'Cash' (or omitting it) means no gateway
  // order is created — the technician collects on site.
  paymentMethod: z.enum(['Card', 'UPI', 'NetBanking', 'Cash', 'Wallet']).optional(),
  purchaseDate: z.coerce.date().optional(),
  serialNo: z.string().optional(),
  applianceId: z.string().optional(),
});

export const listBookingsQuerySchema = z.object({
  status: z.enum(['Upcoming', 'Ongoing', 'Completed', 'Cancelled']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const verifyBookingPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
