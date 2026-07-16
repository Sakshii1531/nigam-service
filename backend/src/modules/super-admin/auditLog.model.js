import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Append-only, no updates, no humanId prefix needed for an internal log — but
// Phase 8 gave it a real GET /super-admin/audit-logs surface, so it still gets
// the toJSON _id->id shaping every other API response uses, for consistency.
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true },
    type: { type: String, enum: ['System', 'Support', 'User', 'Finance', 'Inventory'], required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

applyStandardPlugins(auditLogSchema);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
