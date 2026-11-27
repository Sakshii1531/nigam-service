import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// An admin-made promo code. Who can use it, and for what, is decided by the
// rules below; coupon.service.js evaluates them and tells the customer the
// exact reason a code does not apply.
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // Short headline the customer sees, e.g. "Flat ₹100 off your first AC service".
    title: { type: String, default: '' },
    description: String,
    // 'flat' = `discount` rupees off; 'percent' = `discount`% off, capped at maxDiscount (₹, 0 = no cap).
    discountType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
    discount: { type: Number, required: true },
    maxDiscount: { type: Number, default: 0 },
    // Order value (₹, before GST) the cart must reach.
    minOrderValue: { type: Number, default: 0 },
    // Service category keys it is limited to (empty = every category).
    categories: { type: [String], default: [] },
    firstOrderOnly: { type: Boolean, default: false },
    // How many times one customer may use it (0 = unlimited).
    perUserLimit: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    expiry: Date,
    status: { type: String, enum: ['Active', 'Expired', 'Inactive'], default: 'Active', index: true },
    applicableOn: {
      type: [String],
      enum: ['product', 'service', 'plan'],
      default: ['product', 'service', 'plan'],
    },
  },
  { timestamps: true },
);

applyStandardPlugins(couponSchema);

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
