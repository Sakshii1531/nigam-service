import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Append-only, no updates, no humanId prefix needed for an internal log — but
// Phase 8 gave it a real GET /super-admin/audit-logs surface, so it still gets
// the toJSON _id->id shaping every other API response uses, for consistency.
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true },
    type: { type: String, enum: ['System', 'Support', 'User', 'Finance', 'Inventory', 'Warranty'], required: true, index: true },
    // Which record the action was on, and the status move it made — set by
    // workflows with a status machine (partner warranty claims). Optional so
    // the older free-text entries stay valid.
    entityType: { type: String, default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    reason: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: 1 });

applyStandardPlugins(auditLogSchema);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
