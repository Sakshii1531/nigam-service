import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { watchCatalogueWrites } from '../catalog/catalogCache.js';

// Singleton doc (service layer enforces exactly one exists) — platform-wide config
// surfaced across super-admin's Settings.jsx tabs.
const platformSettingsSchema = new mongoose.Schema(
  {
    platformName: { type: String, default: 'Nigam Care' },
    logoUrl: String,
    supportEmail: String,
    maintenanceMode: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    razorpayKeyId: String,
    defaultGstPercent: { type: Number, default: 18 },

    // Loyalty config (BACKEND_CONTEXT.md §6.3) — coin_rate and referral bonus have
    // no dedicated model (unlike LoyaltyMilestone/Membership/SpinWheelConfig,
    // which are collections of rows); they're single platform-wide numbers, so
    // they live here rather than as a one-row collection of their own.
    coinConversionRate: { type: Number, default: 10 }, // coins per ₹1 — matches wallet.service.js's existing convention
    referralBonusAmount: { type: Number, default: 100 }, // ₹ credited (as coins) per successful referral, to the referrer
    // % off the referred (new) customer's first booking. Stored as platform
    // config alongside referralBonusAmount (LoyaltyProgram.jsx's "Global
    // Referral Multipliers" edits both together) — not yet wired into
    // booking/checkout pricing, which is separate, unbuilt work.
    refereeDiscountPercent: { type: Number, default: 10 },

    // Markup applied over a spare part's cost price when no part-specific
    // override is set — the SpareParts console displays and edits this.
    defaultSparePartMarkupPercent: { type: Number, default: 20 },

    // Share of the total taken as an advance when a customer picks "pay advance".
    bookingAdvancePercent: { type: Number, default: 20 },
    // Paid to a service provider who travelled to a job the customer then cancelled
    // or was unavailable for. 0 disables the payment entirely.
    visitFeeAmount: { type: Number, default: 150 },
  },
  { timestamps: true },
);

applyStandardPlugins(platformSettingsSchema);
// Writes drop the cached customer category trees (catalogCache.js).
platformSettingsSchema.plugin(watchCatalogueWrites);

export const PlatformSettings = mongoose.models.PlatformSettings || mongoose.model('PlatformSettings', platformSettingsSchema);
