import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Fine-grained permission keys, e.g. "service_requests:approve_warranty",
// "invoices:export". Seeded once; Roles reference a subset of these.
const permissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    description: String,
    domain: { type: String, index: true }, // e.g. "users" | "techs" | "brands" | "billing" | "settings"
    // 'brand' keys come from brand-crm/permissions.js and are the only ones a
    // brand may put in its own roles; everything else is platform-only.
    scope: { type: String, enum: ['platform', 'brand'], default: 'platform', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(permissionSchema);

export const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
