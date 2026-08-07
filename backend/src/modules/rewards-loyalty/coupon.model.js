import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    discount: { type: Number, required: true },
    description: String,
    expiry: Date,
    status: { type: String, enum: ['Active', 'Expired', 'Inactive'], default: 'Active', index: true },
    applicableOn: { 
      type: [String], 
      enum: ['product', 'service', 'plan'], 
      default: ['product', 'service', 'plan'] 
    },
  },
  { timestamps: true },
);

applyStandardPlugins(couponSchema);

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
