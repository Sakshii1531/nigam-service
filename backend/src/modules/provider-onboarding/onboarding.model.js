import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
const O = mongoose.Schema.Types.ObjectId;
const event = new mongoose.Schema({ action: String, actor: { type: O, ref: 'User' }, actorRole: String, at: { type: Date, default: Date.now }, message: String }, { _id: false });
const schema = new mongoose.Schema({
  serviceProvider: { type: O, ref: 'ServiceProvider', required: true, unique: true },
  state: { type: String, enum: ['ASM_REVIEW', 'INTERVIEW_SCHEDULED', 'CHANGES_REQUESTED', 'ASM_REJECTED', 'SUPER_ADMIN_REVIEW', 'SUPER_ADMIN_REJECTED', 'APPROVED'], default: 'ASM_REVIEW', index: true },
  revision: { type: Number, default: 0 },
  requestedCategories: [{ type: O, ref: 'Category' }],
  approvedCategories: [{ type: O, ref: 'Category' }],
  interviewAt: Date,
  interviewNotes: String,
  interviewActor: { type: O, ref: 'User' },
  interviewExceptionReason: String,
  finalActor: { type: O, ref: 'User' },
  finalAt: Date,
  decisionReason: String,
  categoryDecisions: [{ category: { type: O, ref: 'Category' }, approved: Boolean, reason: String, _id: false }],
  documentReview: { aadhar: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' }, background: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' } },
  qualifyingOrder: { type: O, ref: 'ProviderKitOrder' },
  receiptVerifiedAt: Date,
  events: [event],
}, { timestamps: true, optimisticConcurrency: true });
applyStandardPlugins(schema);
export const ProviderOnboarding = mongoose.models.ProviderOnboarding || mongoose.model('ProviderOnboarding', schema);
