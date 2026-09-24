import { z } from 'zod';

const addressSchema = z.object({
  type: z.enum(['Home', 'Work', 'Other']).optional(),
  house: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  name: z.string().optional(),
}).passthrough();

const timeSlotSchema = z.object({ date: z.string(), time: z.string() });

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

// A booking names ONE catalogue offering (docs/master-catalogue Phase 4); the
// server prices it with the same engine as POST /catalog/quote. Strict: the
// pre-catalogue shape (category / serviceSlug / serviceName / price) is
// refused with a clear 400 instead of being silently re-interpreted.
export const createBookingSchema = z
  .object({
    offeringId: objectId,
    variantId: objectId.nullish(),
    quantity: z.coerce.number().int().positive().default(1),
    isExpress: z.boolean().optional(),
    requiredInfo: z.array(z.object({ key: z.string().min(1).max(40), value: z.string().max(500) })).max(20).optional(),
    couponCode: z.string().trim().min(1).max(40).nullish(),
    useCoins: z.boolean().optional(),
    // The final amount the customer was shown. If the server's price differs
    // (the rate changed meanwhile) the booking is refused with 409 PRICE_CHANGED.
    expectedFinalAmount: z.coerce.number().nonnegative(),
    brand: z.string().optional(),
    scheduledDate: z.coerce.date().optional(),
    timeSlot: z.union([timeSlotSchema, z.string()]).optional(),
    timeGroup: z.string().optional(),
    isInstant: z.boolean().optional(),
    address: addressSchema.optional(),
    fullName: z.string().optional(),
    mobile: z.string().optional(),
    paymentMode: z.enum(['advance', 'after']).optional(),
    // How the advance is collected. 'Cash' (or omitting it) means no gateway
    // order is created — the service provider collects on site.
    paymentMethod: z.enum(['Card', 'UPI', 'NetBanking', 'Cash', 'Wallet']).optional(),
    purchaseDate: z.coerce.date().optional(),
    serialNo: z.string().optional(),
    applianceId: z.string().optional(),
  })
  .strict();

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

export const rescheduleBookingSchema = z.object({
  scheduledDate: z.coerce.date().optional(),
  timeSlot: z.union([timeSlotSchema, z.string()]).optional(),
  reason: z.string().optional(),
});

export const respondPartRequestSchema = z.object({
  approve: z.boolean(),
});
