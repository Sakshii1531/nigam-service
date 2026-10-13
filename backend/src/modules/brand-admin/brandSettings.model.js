import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';

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
    autoAssignServiceProvider: { type: Boolean, default: true },
    requireCompletionPhoto: { type: Boolean, default: true },

    // Brand CRM (docs/brand-crm README D6): ticket sources approved on
    // creation instead of waiting in Pending Approval. Empty = always review.
    autoApproveSources: { type: [String], enum: ['toll_free', 'brand_manual'], default: [] },
    // Who owns a new ticket on the brand side: nobody, the registering user, or round-robin (Phase 9).
    escalationMatrix: {
      warning: { role: { type: String, default: 'brand_manager' }, level: { type: Number, default: 1 } },
      breach: { role: { type: String, default: 'quality_escalation' }, level: { type: Number, default: 2 }, platform: { type: Boolean, default: true } },
      escalationResponseHours: { type: Number, default: 4 },
    },
    partsApprovalThreshold: { type: Number, min: 0, default: 0 },
    cceAutoAssign: { type: String, enum: ['none', 'registrant', 'round_robin'], default: 'registrant' },

    // Notification channels for this brand's own staff.
    emailNotifications: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
  },
  { timestamps: true },
);

brandScopeGuard(brandSettingsSchema);
applyStandardPlugins(brandSettingsSchema);

export const BrandSettings =
  mongoose.models.BrandSettings || mongoose.model('BrandSettings', brandSettingsSchema);
