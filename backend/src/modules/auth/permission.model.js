import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Fine-grained permission keys, e.g. "service_requests:approve_warranty",
// "invoices:export". Seeded once; Roles reference a subset of these.
const permissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    description: String,
    domain: { type: String, index: true }, // e.g. "users" | "techs" | "brands" | "billing" | "settings"
  },
  { timestamps: true },
);

applyStandardPlugins(permissionSchema);

export const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
