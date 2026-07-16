import mongoose from 'mongoose';

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
  },
  { timestamps: true },
);

export const PlatformSettings = mongoose.models.PlatformSettings || mongoose.model('PlatformSettings', platformSettingsSchema);
