import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { auditContext, sanitizeAudit, fieldDiff } from '../shared/auditContext.js';

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
    // Brand CRM (docs/brand-crm §13): whose data this was, who did it as they
    // were at the time, and structured detail such as a field diff.
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    actor: { type: mongoose.Schema.Types.Mixed, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: 1 });
auditLogSchema.index({ brand: 1, createdAt: -1, _id: -1 });
auditLogSchema.index({ brand: 1, entityType: 1, entityId: 1, createdAt: -1 });

auditLogSchema.pre('validate', async function () {
  const context = auditContext.getStore();
  const req = context?.req;
  if (!this.actor && (this.user || req?.user?.id)) {
    const user = await mongoose.model('User').findById(this.user || req.user.id)
      .select('name employeeId department role assignedRoles').populate('assignedRoles', 'name').lean();
    if (user) this.actor = { user: user._id, name: user.name, employeeId: user.employeeId || null,
      department: user.department || null, kind: user.role === 'brand_admin' ? 'brand' : 'admin',
      roles: (user.assignedRoles || []).map(r => r.name) };
  }
  if (this.meta?.before && this.meta?.after && !this.meta.changes) {
    this.meta = { ...this.meta, changes: fieldDiff(this.meta.before, this.meta.after) };
  }
  this.meta = sanitizeAudit(this.meta);
});
auditLogSchema.post('save', function () {
  const context = auditContext.getStore();
  if (context) context.res.locals.audited = true;
});

applyStandardPlugins(auditLogSchema);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
