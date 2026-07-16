import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { addressSchema } from './address.schema.js';
import { ID_PREFIXES, ROLES } from '../../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: Object.values(ROLES), required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, index: true, sparse: true },
    email: { type: String, index: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: String,
    addresses: [addressSchema],

    // Customer-only fields — harmless left unused for other roles, avoids a fragile
    // discriminator hierarchy for what's currently a handful of extra fields.
    walletCoins: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    membershipTier: { type: String, enum: ['Silver', 'Gold', 'Plus Gold', 'Diamond', 'Platinum'], default: null },
    source: { type: String, enum: ['B2B', 'B2C', 'AMC', 'Extended Warranty'], default: 'B2C' },

    // brand_admin-only: which brand this account is scoped to (enforced by requireBrandScope in Phase 3).
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },

    // RBAC assignment — the roles/permissions this user has, distinct from the coarse
    // `role` field above (which just says which of the 4 apps they log into).
    assignedRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],

    status: { type: String, enum: ['Active', 'Suspended', 'Pending'], default: 'Active', index: true },
    lastActiveAt: Date,
  },
  { timestamps: true },
);

userSchema.index({ phone: 1, role: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1, role: 1 }, { unique: true, sparse: true });

applyStandardPlugins(userSchema, { prefix: ID_PREFIXES.CUSTOMER });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
