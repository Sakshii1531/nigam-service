import { Coupon } from './coupon.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listActiveCoupons() {
  return Coupon.find({ status: 'Active', $or: [{ expiry: null }, { expiry: { $gte: new Date() } }] }).sort({ createdAt: -1 });
}

export async function createCoupon(data) {
  return Coupon.create(data);
}

/** `discount` is a flat rupee amount off (not a percentage) — matches the
 * frontend's Coupons.jsx badge copy ("₹150 off", not "10% off"). Used by
 * order.service.js to price a checkout server-side, never trusting a
 * client-supplied discount amount. */
export async function resolveCoupon(code) {
  if (!code) return null;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new ApiError(404, `No coupon found for code "${code}"`);
  if (coupon.status !== 'Active') throw new ApiError(400, 'Coupon is no longer active');
  if (coupon.expiry && coupon.expiry.getTime() < Date.now()) throw new ApiError(400, 'Coupon has expired');
  return coupon;
}
