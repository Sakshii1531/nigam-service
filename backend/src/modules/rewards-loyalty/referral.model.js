import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// User.referralCode is the code a user shares; this collection records each
// redemption of it (one row per successful referred signup).
const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bonusAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Credited'], default: 'Pending' },
  },
  { timestamps: true },
);

applyStandardPlugins(referralSchema);

export const Referral = mongoose.models.Referral || mongoose.model('Referral', referralSchema);
