import { z } from 'zod';

const money = z.coerce.number().min(0).max(10_000_000);
const optionalDate = z.preprocess((v) => (v === '' ? null : v), z.coerce.date().nullable().optional());

const couponFields = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - or _ only'),
  title: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional(),
  discountType: z.enum(['flat', 'percent']).optional(),
  discount: z.coerce.number().positive(),
  maxDiscount: money.optional(),
  minOrderValue: money.optional(),
  categories: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  firstOrderOnly: z.boolean().optional(),
  perUserLimit: z.coerce.number().int().min(0).max(1000).optional(),
  startsAt: optionalDate,
  expiry: optionalDate,
  status: z.enum(['Active', 'Inactive', 'Expired']).optional(),
  applicableOn: z.array(z.enum(['product', 'service', 'plan'])).min(1).optional(),
});

const percentWithinRange = (c) => c.discountType !== 'percent' || c.discount === undefined || c.discount <= 100;
const datesInOrder = (c) => !c.startsAt || !c.expiry || c.startsAt <= c.expiry;

export const createCouponSchema = couponFields
  .refine(percentWithinRange, { message: 'A percentage discount cannot be more than 100', path: ['discount'] })
  .refine(datesInOrder, { message: 'The end date must be after the start date', path: ['expiry'] });

export const updateCouponSchema = couponFields
  .partial()
  .refine(percentWithinRange, { message: 'A percentage discount cannot be more than 100', path: ['discount'] })
  .refine(datesInOrder, { message: 'The end date must be after the start date', path: ['expiry'] });

export const checkoutCouponsSchema = z.object({
  scope: z.enum(['product', 'service', 'plan']).default('service'),
  orderValue: money.default(0),
  categoryKey: z.string().trim().max(60).nullish(),
});
