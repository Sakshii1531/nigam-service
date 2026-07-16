import mongoose from 'mongoose';

// Append-only, no updates — no toJSON/humanId plugin needed for an internal log.
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true },
    type: { type: String, enum: ['System', 'Support', 'User', 'Finance', 'Inventory'], required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
