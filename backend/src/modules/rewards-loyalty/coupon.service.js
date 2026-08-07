import { Coupon } from './coupon.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listActiveCoupons() {
  await Coupon.updateMany(
    { status: 'Active', expiry: { $lt: new Date() } },
    { status: 'Inactive' }
  );
  return Coupon.find({ status: 'Active' }).sort({ createdAt: -1 });
}

export async function createCoupon(data) {
  // If expiry is in the past, set status as Inactive
  const status = (data.expiry && new Date(data.expiry).getTime() < Date.now()) ? 'Inactive' : 'Active';
  return Coupon.create({ ...data, status });
}

/** `discount` is a flat rupee amount off (not a percentage) — matches the
 * frontend's Coupons.jsx badge copy ("I150 off", not "10% off"). Used by
 * order.service.js to price a checkout server-side, never trusting a
 * client-supplied discount amount. */
export async function resolveCoupon(code, targetScope) {
  if (!code) return null;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new ApiError(404, `No coupon found for code "${code}"`);
  
  if (coupon.expiry && coupon.expiry.getTime() < Date.now()) {
    if (coupon.status === 'Active') {
      coupon.status = 'Inactive';
      await coupon.save();
    }
  }
  
  if (coupon.status !== 'Active') throw new ApiError(400, 'Coupon is no longer active or has expired');

  if (targetScope && coupon.applicableOn && !coupon.applicableOn.includes(targetScope)) {
    throw new ApiError(400, `Coupon is not applicable on ${targetScope} purchases`);
  }

  return coupon;
}

export async function listAllCoupons() {
  await Coupon.updateMany(
    { status: 'Active', expiry: { $lt: new Date() } },
    { status: 'Inactive' }
  );
  return Coupon.find({}).sort({ createdAt: -1 });
}

export async function toggleCouponStatus(id, status) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  coupon.status = status;
  await coupon.save();
  return coupon;
}

export async function updateCoupon(id, data) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  
  if (data.code) coupon.code = data.code.toUpperCase();
  if (data.discount !== undefined) coupon.discount = Number(data.discount);
  if (data.description !== undefined) coupon.description = data.description;
  if (data.expiry !== undefined) coupon.expiry = data.expiry ? new Date(data.expiry) : null;
  if (data.status !== undefined) coupon.status = data.status;

  await coupon.save();
  return coupon;
}

export async function deleteCoupon(id) {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  return { success: true };
}
