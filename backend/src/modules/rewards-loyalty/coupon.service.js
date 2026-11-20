import mongoose from 'mongoose';
import { Coupon } from './coupon.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const SCOPE_NOUN = { service: 'service bookings', product: 'store orders', plan: 'protection plans' };

async function expireOldCoupons() {
  await Coupon.updateMany({ status: 'Active', expiry: { $lt: new Date() } }, { status: 'Inactive' });
}

export async function listActiveCoupons() {
  await expireOldCoupons();
  return Coupon.find({ status: 'Active' }).sort({ createdAt: -1 });
}

export async function createCoupon(data) {
  const status = data.expiry && new Date(data.expiry).getTime() < Date.now() ? 'Inactive' : data.status || 'Active';
  if (await Coupon.exists({ code: String(data.code).toUpperCase() })) throw new ApiError(409, `A coupon with code ${String(data.code).toUpperCase()} already exists`);
  return Coupon.create({ ...data, code: String(data.code).toUpperCase(), status });
}

/** Rupees a coupon takes off an order of `orderValue` rupees (before GST). */
export function couponDiscount(coupon, orderValue) {
  const value = Math.max(0, Number(orderValue) || 0);
  let off = coupon.discountType === 'percent' ? (value * coupon.discount) / 100 : coupon.discount;
  if (coupon.discountType === 'percent' && coupon.maxDiscount > 0) off = Math.min(off, coupon.maxDiscount);
  return Math.round(Math.min(off, value) * 100) / 100;
}

/** How many times this customer has already used the code on a live booking. */
async function timesUsed(code, userId) {
  if (!userId) return 0;
  const Booking = mongoose.models.Booking;
  if (!Booking) return 0;
  return Booking.countDocuments({ user: userId, 'discount.code': code, status: { $ne: 'Cancelled' } });
}

async function hasEarlierBooking(userId) {
  if (!userId) return false;
  const Booking = mongoose.models.Booking;
  if (!Booking) return false;
  return Boolean(await Booking.exists({ user: userId, status: { $ne: 'Cancelled' } }));
}

/**
 * Checks every rule of a coupon against one checkout.
 * @returns {{ eligible: boolean, reason: string|null, discount: number }} discount in ₹
 */
export async function evaluateCoupon(coupon, { scope = null, userId = null, orderValue = 0, categoryKey = null, at = new Date() } = {}) {
  const fail = (reason) => ({ eligible: false, reason, discount: 0 });
  if (coupon.status !== 'Active' || (coupon.expiry && coupon.expiry.getTime() < at.getTime())) return fail('This coupon has expired');
  if (coupon.startsAt && coupon.startsAt.getTime() > at.getTime()) {
    return fail(`Starts on ${coupon.startsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
  }
  if (scope && coupon.applicableOn?.length && !coupon.applicableOn.includes(scope)) return fail(`Not valid on ${SCOPE_NOUN[scope] || scope}`);
  if (categoryKey && coupon.categories?.length && !coupon.categories.some((c) => c.toLowerCase() === String(categoryKey).toLowerCase())) {
    return fail(`Valid only on ${coupon.categories.join(', ')}`);
  }
  if (coupon.minOrderValue > 0 && Number(orderValue) < coupon.minOrderValue) {
    return fail(`Add ${rupees(Math.ceil(coupon.minOrderValue - Number(orderValue)))} more to use this (min. order ${rupees(coupon.minOrderValue)})`);
  }
  if (coupon.firstOrderOnly) {
    if (!userId) return fail('Sign in to use this first-booking offer');
    if (await hasEarlierBooking(userId)) return fail('Valid on your first booking only');
  }
  if (coupon.perUserLimit > 0 && (await timesUsed(coupon.code, userId)) >= coupon.perUserLimit) {
    return fail(coupon.perUserLimit === 1 ? 'You have already used this coupon' : `You have used this coupon ${coupon.perUserLimit} times`);
  }
  const discount = couponDiscount(coupon, orderValue);
  if (discount <= 0) return fail('Nothing to discount on this order');
  return { eligible: true, reason: null, discount };
}

/**
 * Finds a code and, when `context` is given, checks it against the checkout.
 * Returns the coupon document plus the ₹ discount it gives (flat value when
 * no context is known). Throws a 4xx ApiError with the customer-facing reason.
 */
export async function resolveCoupon(code, targetScope, context = null) {
  if (!code) return null;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new ApiError(404, `No coupon found for code "${code}"`);
  if (coupon.expiry && coupon.expiry.getTime() < Date.now() && coupon.status === 'Active') {
    coupon.status = 'Inactive';
    await coupon.save();
  }
  const result = await evaluateCoupon(coupon, { scope: targetScope, ...(context || {}), orderValue: context ? context.orderValue : Number.MAX_SAFE_INTEGER });
  if (!result.eligible) throw new ApiError(400, result.reason);
  coupon.appliedDiscount = context ? result.discount : coupon.discountType === 'flat' ? coupon.discount : 0;
  return coupon;
}

/** What the checkout shows: every live coupon, best usable first, with the reason others don't apply. */
export async function listCouponsForCheckout({ scope = 'service', userId = null, orderValue = 0, categoryKey = null }) {
  await expireOldCoupons();
  const now = new Date();
  const coupons = await Coupon.find({ status: 'Active' }).sort({ createdAt: -1 });
  const rows = await Promise.all(
    coupons
      .filter((c) => !scope || !c.applicableOn?.length || c.applicableOn.includes(scope))
      .map(async (c) => {
        const result = await evaluateCoupon(c, { scope, userId, orderValue, categoryKey, at: now });
        return {
          code: c.code,
          title: c.title || (c.discountType === 'percent' ? `${c.discount}% off${c.maxDiscount ? ` up to ${rupees(c.maxDiscount)}` : ''}` : `Flat ${rupees(c.discount)} off`),
          description: c.description || '',
          discountType: c.discountType,
          discount: c.discount,
          maxDiscount: c.maxDiscount || 0,
          minOrderValue: c.minOrderValue || 0,
          expiry: c.expiry || null,
          eligible: result.eligible,
          reason: result.reason,
          savings: result.discount,
        };
      }),
  );
  return rows.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.savings - a.savings);
}

export async function listAllCoupons() {
  await expireOldCoupons();
  return Coupon.find({}).sort({ createdAt: -1 });
}

export async function toggleCouponStatus(id, status) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  coupon.status = status;
  await coupon.save();
  return coupon;
}

const EDITABLE = ['title', 'description', 'discountType', 'discount', 'maxDiscount', 'minOrderValue', 'categories', 'firstOrderOnly', 'perUserLimit', 'startsAt', 'expiry', 'status', 'applicableOn'];

export async function updateCoupon(id, data) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  if (data.code && data.code.toUpperCase() !== coupon.code) {
    if (await Coupon.exists({ code: data.code.toUpperCase(), _id: { $ne: coupon._id } })) throw new ApiError(409, `A coupon with code ${data.code.toUpperCase()} already exists`);
    coupon.code = data.code.toUpperCase();
  }
  for (const key of EDITABLE) if (data[key] !== undefined) coupon[key] = data[key];
  if (coupon.expiry && coupon.expiry.getTime() < Date.now() && coupon.status === 'Active') coupon.status = 'Inactive';
  await coupon.save();
  return coupon;
}

export async function deleteCoupon(id) {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  return { success: true };
}
