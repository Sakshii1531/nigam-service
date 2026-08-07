import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// The referral offers super-admin configures. Distinct from `Referral`, which
// records individual redemptions — this is the offer those redemptions pay out
// against.
const referralCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Coins credited to the referrer.
    bonus: { type: Number, default: 0 },
    // Percentage off for the referred user's first booking.
    discount: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(referralCampaignSchema);

export const ReferralCampaign =
  mongoose.models.ReferralCampaign || mongoose.model('ReferralCampaign', referralCampaignSchema);
