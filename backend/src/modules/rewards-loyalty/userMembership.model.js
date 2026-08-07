import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// A customer's purchased membership. Membership tiers already existed as a
// catalogue, but nothing recorded who had bought one — MembershipPlans.jsx
// inferred the "current plan" from whether the customer happened to hold an
// active AMC subscription, so an AMC customer was shown as a Gold member.
const userMembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
    pricePaid: { type: Number, required: true },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['Pending Payment', 'Active', 'Expired', 'Cancelled'], default: 'Pending Payment', index: true },
  },
  { timestamps: true },
);

userMembershipSchema.index({ user: 1, status: 1 });

applyStandardPlugins(userMembershipSchema);

export const UserMembership =
  mongoose.models.UserMembership || mongoose.model('UserMembership', userMembershipSchema);
