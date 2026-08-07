import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Per-brand configuration, one document per Brand — the brand-scoped counterpart
// to super-admin's singleton PlatformSettings. Kept separate from the Brand
// document itself so operational toggles can change without touching the
// platform-owned brand record (name, status, category), which super-admin owns.
const brandSettingsSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, unique: true, index: true },

    // Brand profile — how this brand presents itself to its own customers.
    supportEmail: String,
    supportPhone: String,
    website: String,

    // Service configuration.
    autoAssignTechnician: { type: Boolean, default: true },
    requireCompletionPhoto: { type: Boolean, default: true },

    // Notification channels for this brand's own staff.
    emailNotifications: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
  },
  { timestamps: true },
);

applyStandardPlugins(brandSettingsSchema);

export const BrandSettings =
  mongoose.models.BrandSettings || mongoose.model('BrandSettings', brandSettingsSchema);
