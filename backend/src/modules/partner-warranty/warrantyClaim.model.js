import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';
import { CLAIM_STATUSES, CLAIM_STATUS, CLAIM_ACTIONS, EVENT_VISIBILITY, ACTOR_KINDS } from './claimStatus.js';

// A customer's warranty claim against a partner brand (docs/partner-warranty).
// Deliberately separate from warranty-amc-exchange/claim.model.js, which is a
// spare-part reimbursement claim raised by partners — different owner,
// different lifecycle.

const { ObjectId } = mongoose.Schema.Types;

const timelineEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    action: { type: String, enum: CLAIM_ACTIONS, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    actor: {
      kind: { type: String, enum: ACTOR_KINDS, required: true },
      user: { type: ObjectId, ref: 'User', default: null },
      name: String,
    },
    note: String,
    // customer: everyone sees it · brand: brand + admin · internal: admin only
    visibility: { type: String, enum: EVENT_VISIBILITY, default: 'customer' },
  },
  { _id: true },
);

const documentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['invoice', 'warranty_card', 'product_photo', 'additional'], required: true },
    url: { type: String, required: true },
    name: String,
    uploadedBy: { type: ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now },
    // Set when the document answered a brand's "request more information".
    infoRequest: { type: ObjectId, default: null },
  },
  { _id: true },
);

const infoRequestSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    requestedBy: { type: ObjectId, ref: 'User', default: null },
    requestedAt: { type: Date, default: Date.now },
    response: String,
    respondedAt: Date,
  },
  { _id: true },
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    name: String,
    house: String,
    landmark: String,
    city: String,
    state: String,
    pincode: { type: String, required: true },
    latitude: Number,
    longitude: Number,
  },
  { _id: false },
);

const warrantyClaimSchema = new mongoose.Schema(
  {
    // humanId (plugin) = NCCW-{current year}-######
    customer: { type: ObjectId, ref: 'User', required: true, index: true },
    // The routing key: the brand panel lists claims by this ObjectId. Never a name.
    brand: { type: ObjectId, ref: 'Brand', required: true, index: true },
    group: { type: ObjectId, ref: 'WarrantyGroup', default: null },
    category: { type: ObjectId, ref: 'Category', default: null },
    // Category key ('AC', 'Refrigerator') — what partner `specs` are matched on.
    categoryKey: { type: String, required: true, index: true },
    productType: { type: ObjectId, ref: 'ProductType', default: null },
    productName: { type: String, required: true },
    issue: { type: ObjectId, ref: 'WarrantyIssue', default: null },
    issueName: { type: String, required: true },

    modelNumber: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    purchaseDate: Date,
    remarks: { type: String, maxlength: 1000 },

    // System estimate from purchase date + brand warranty months. Informational:
    // the brand makes the actual decision.
    warrantyCheck: {
      status: { type: String, enum: ['In Warranty', 'Out of Warranty', 'Unknown'], default: 'Unknown' },
      months: Number,
      expiresOn: Date,
    },

    documents: [documentSchema],
    address: { type: addressSnapshotSchema, required: true },

    status: { type: String, enum: CLAIM_STATUSES, default: CLAIM_STATUS.SUBMITTED, index: true },
    statusBeforeHold: { type: String, enum: [...CLAIM_STATUSES, null], default: null },
    rejectionReason: { type: String, default: null },
    infoRequests: [infoRequestSchema],

    // The Service Job (ServiceRequest with an NCCJ humanId), once approved.
    serviceRequest: { type: ObjectId, ref: 'ServiceRequest', default: null, index: true },
    visit: { date: String, slot: String },

    flags: {
      escalated: { type: Boolean, default: false },
      escalatedAt: Date,
      escalationReason: String,
      allocationFailed: { type: Boolean, default: false },
      unauthorizedFallback: { type: Boolean, default: false },
    },

    // Stage deadlines (docs/partner-warranty Phase 9). `hours` is a snapshot of
    // the brand/platform SLA at submission, so later edits never move an
    // existing claim's deadlines. The clock pauses while `pausedAt` is set
    // (On Hold, or waiting on the customer) and deadlines shift on resume.
    sla: {
      hours: { approval: Number, assignment: Number, visit: Number, resolution: Number },
      brandApprovalDueAt: Date,
      assignmentDueAt: Date,
      visitDueAt: Date,
      resolutionDueAt: Date,
      met: { brandApproval: Date, assignment: Date, visit: Date, resolution: Date },
      pausedAt: { type: Date, default: null },
      state: { type: String, enum: ['ok', 'warning', 'breached'], default: 'ok', index: true },
      warnings: [String],
      breaches: [String],
    },

    timeline: [timelineEventSchema],
    closedAt: Date,
    cancelledAt: Date,
  },
  // optimisticConcurrency: every save checks the version it read, so two
  // people deciding the same claim at once can't both win — the second save
  // fails with a VersionError (surfaced as 409 by the services).
  { timestamps: true, optimisticConcurrency: true },
);

warrantyClaimSchema.index({ brand: 1, status: 1, createdAt: -1 });
warrantyClaimSchema.index({ customer: 1, createdAt: -1 });
warrantyClaimSchema.index({ status: 1, createdAt: -1 });
warrantyClaimSchema.index({ 'address.pincode': 1 });
warrantyClaimSchema.index({ brand: 1, serialNumber: 1 });

applyStandardPlugins(warrantyClaimSchema, { prefix: ID_PREFIXES.WARRANTY_TICKET });

export const WarrantyClaim = mongoose.models.WarrantyClaim || mongoose.model('WarrantyClaim', warrantyClaimSchema);
