import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Single collection for both brand-level escalations (brand-admin's Escalations.jsx)
// and platform-level ones (super-admin's EscalationDesk.jsx) via `scope`, same
// reasoning as the Role model — one pipeline, filtered by scope+brand/city.
const escalationSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['brand', 'platform'], required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null, index: true },
    warrantyClaim:{type:mongoose.Schema.Types.ObjectId,ref:'WarrantyClaim',default:null,index:true},
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required:function(){return !this.warrantyClaim;} },
    slaStage: String,
    level: { type: Number, default: 1, min: 1, max: 3 },
    responsible: { role: String, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } },
    dueAt: Date,
    resolution: String,
    resolvedAt: Date,
    resolvedBy: mongoose.Schema.Types.Mixed,
    history: [{ at: { type: Date, default: Date.now }, action: String, actor: mongoose.Schema.Types.Mixed, note: String }],
    openKey: { type: String },
    reason: String,
    description: String,
    raisedBy: { type: String, enum: ['Customer', 'ServiceProvider', 'System Auto', 'QA Team', 'Brand User'], default: 'Customer' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: ['Critical', 'High', 'P1', 'P2', 'Medium', 'P3', 'Low', 'Normal'], default: 'Medium' },
    status: {
      type: String,
      enum: ['Open', 'Unassigned', 'Under Review', 'In Progress', 'Assigned to Senior', 'Resolved'],
      default: 'Open',
      index: true,
    },
  },
  { timestamps: true },
);

escalationSchema.index({brand:1,scope:1,createdAt:-1,status:1});
escalationSchema.index({ openKey: 1 }, { unique: true, partialFilterExpression: { openKey: { $type: 'string' } } });

// daysOpen is computed at read time from createdAt rather than stored, so it's never stale.
escalationSchema.virtual('daysOpen').get(function daysOpen() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

applyStandardPlugins(escalationSchema);

export const Escalation = mongoose.models.Escalation || mongoose.model('Escalation', escalationSchema);
