import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Transactional outbox for partner-warranty events (docs/partner-warranty
// Phase 10, ARCHITECTURE §8). Every CLAIM_CREATED … CLAIM_CLOSED is written
// here right after the claim change that caused it; the webhook sweep then
// delivers `pending` rows to the brand's CRM. Rows for brands without a
// webhook are kept as `skipped` — the event log is useful on its own.

export const WARRANTY_EVENT_TYPES = Object.freeze([
  'CLAIM_CREATED',
  'CLAIM_INFO_REQUESTED',
  'CLAIM_APPROVED',
  'CLAIM_REJECTED',
  'JOB_CREATED',
  'PARTNER_ASSIGNED',
  'JOB_STARTED',
  'JOB_COMPLETED',
  'CLAIM_CLOSED',
  'CLAIM_CANCELLED',
]);

const deliverySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    httpStatus: Number,
    error: String,
    durationMs: Number,
  },
  { _id: false },
);

const domainEventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: [...WARRANTY_EVENT_TYPES, 'PING'], required: true, index: true },
    claim: { type: mongoose.Schema.Types.ObjectId, ref: 'WarrantyClaim', default: null, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    occurredAt: { type: Date, default: Date.now },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },

    status: { type: String, enum: ['pending', 'delivered', 'failed', 'skipped'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    deliveredAt: Date,
    lastError: String,
    deliveries: [deliverySchema],
  },
  { timestamps: true },
);

domainEventSchema.index({ status: 1, nextAttemptAt: 1 });
domainEventSchema.index({ brand: 1, createdAt: -1 });

applyStandardPlugins(domainEventSchema);

export const DomainEvent = mongoose.models.DomainEvent || mongoose.model('DomainEvent', domainEventSchema);
