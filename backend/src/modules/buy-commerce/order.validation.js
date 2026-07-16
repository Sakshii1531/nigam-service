import { z } from 'zod';

const addressSchema = z.object({
  type: z.enum(['Home', 'Work', 'Other']).optional(),
  house: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  name: z.string().optional(),
});

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

export const createOrderSchema = z
  .object({
    items: z.array(itemSchema).optional(),
    useCart: z.boolean().optional(),
    address: addressSchema.optional(),
    couponCode: z.string().optional(),
    exchangeRequestId: z.string().optional(),
    coinsToRedeem: z.coerce.number().int().nonnegative().optional(),
    paymentMethod: z.enum(['Card', 'UPI', 'NetBanking', 'Cash', 'Wallet']).optional(),
  })
  .refine((data) => data.useCart || (data.items && data.items.length > 0), {
    message: 'Either useCart or a non-empty items array is required',
  });

export const listOrdersQuerySchema = z.object({
  status: z.enum(['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
