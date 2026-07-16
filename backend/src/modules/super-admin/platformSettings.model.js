import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Singleton doc (service layer enforces exactly one exists) — platform-wide config
// surfaced across super-admin's Settings.jsx tabs.
const platformSettingsSchema = new mongoose.Schema(
  {
    platformName: { type: String, default: 'Nigam Care' },
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
    referralBonusAmount: { type: Number, default: 100 }, // ₹ credited (as coins) per successful referral
  },
  { timestamps: true },
);

applyStandardPlugins(platformSettingsSchema);

export const PlatformSettings = mongoose.models.PlatformSettings || mongoose.model('PlatformSettings', platformSettingsSchema);
