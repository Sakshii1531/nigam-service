import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
import { ID_PREFIXES } from '../../config/constants.js';
import { CLAIM_STATUSES, CLAIM_STATUS, CLAIM_ACTIONS, EVENT_VISIBILITY, ACTOR_KINDS } from './claimStatus.js';
import {
  TICKET_SOURCES,
  TICKET_PRIORITIES,
  SERVICE_TYPES,
  WARRANTY_STATUSES,
  COVERAGE_DECISIONS,
  REJECTION_CODES,
  JOB_STAGES,
  VISIT_SLOTS,
  DOCUMENT_KINDS,
} from './ticketConstants.js';

// A customer's warranty claim against a partner brand (docs/partner-warranty).
// Deliberately separate from warranty-amc-exchange/claim.model.js, which is a
// spare-part reimbursement claim raised by partners — different owner,
// different lifecycle.

const { ObjectId, Mixed } = mongoose.Schema.Types;

// Who did something, frozen at the time they did it (docs/brand-crm §5): a
// later rename or role change never rewrites the history of a decision.
const actorSnapshotFields = {
  kind: { type: String, enum: ACTOR_KINDS, required: true },
  user: { type: ObjectId, ref: 'User', default: null },
  name: String,
  employeeId: { type: String, default: null },
  roles: { type: [String], default: undefined },
  department: { type: String, default: null },
};
const actorSnapshotSchema = new mongoose.Schema(actorSnapshotFields, { _id: false });

const timelineEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    action: { type: String, enum: CLAIM_ACTIONS, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    actor: actorSnapshotFields,
    note: String,
    // Structured detail for events that carry more than a note (a contact's
    // channel and outcome, a part's status) — Brand CRM phases 9–13.
    meta: { type: Mixed, default: undefined },
    // customer: everyone sees it · brand: brand + admin · internal: admin only
    visibility: { type: String, enum: EVENT_VISIBILITY, default: 'customer' },
  },
  { _id: true },
);

const documentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: DOCUMENT_KINDS, required: true },
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
    documentKinds:[{type:String,enum:DOCUMENT_KINDS}],
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

const contactRequestSchema = new mongoose.Schema(
  {
    reason: { type: String, required: true },
    requestedBy: { type: actorSnapshotSchema, required: true },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['open', 'done', 'failed'], default: 'open' },
    outcome: String,
    doneBy: { type: actorSnapshotSchema, default: null },
    doneAt: Date,
  },
  { _id: true },
);

const warrantyClaimSchema = new mongoose.Schema(
  {
    // humanId (plugin) = NCCW-{current year}-###### — the Master Ticket ID.
    // The brand's own number for the same ticket: {Brand.ticketPrefix}-{YYYY}-######.
    brandTicketNo: { type: String, default: null },
    // Where the complaint came in. Set once by ticketIntake.createTicket.
    source: { type: String, enum: TICKET_SOURCES, required: true, immutable: true },
    // Trace back to the channel: an intake idempotency key, a WhatsApp message, a call.
    sourceRef: {
      externalId: { type: String, default: undefined },
      channelMessageId: { type: String, default: undefined },
      callId: { type: String, default: undefined },
      apiKey: { type: ObjectId, ref: 'ApiKey', default: undefined },
    },

    customer: { type: ObjectId, ref: 'User', required: true, index: true },
    // The routing key: the brand panel lists claims by this ObjectId. Never a name.
    brand: { type: ObjectId, ref: 'Brand', required: true, index: true },
    group: { type: ObjectId, ref: 'WarrantyGroup', default: null },
    category: { type: ObjectId, ref: 'Category', default: null },
    // Category key ('AC', 'Refrigerator') — what partner `specs` are matched on.
    categoryKey: { type: String, required: true, index: true },
    productType: { type: ObjectId, ref: 'ProductType', default: null },
    productName: { type: String, required: true },
    // A catalogue issue, or free text (issue null) when a CCE or an intake
    // channel describes a problem the catalogue doesn't list.
    issue: { type: ObjectId, ref: 'WarrantyIssue', default: null },
    issueName: { type: String, required: true },
    serviceType: { type: String, enum: SERVICE_TYPES, default: 'repair' },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'Normal' },

    // The customer as captured at registration (a CCE may type the name the
    // caller gives). The live record is `customer`.
    customerSnapshot: {
      name: String,
      phone: String,
      alternatePhone: String,
      email: String,
    },
    // null = no staff member (customer app, WhatsApp, API — the system).
    registeredBy: { type: actorSnapshotSchema, default: null },
    // The brand-side owner of the ticket.
    assignedCce: {
      type: new mongoose.Schema({ ...actorSnapshotFields, assignedAt: { type: Date, default: Date.now } }, { _id: false }),
      default: null,
    },
    preferredVisit: {
      date: String, // YYYY-MM-DD
      slot: { type: String, enum: [...VISIT_SLOTS, null], default: null },
      notes: String,
    },

    modelNumber: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    purchaseDate: Date,
    remarks: { type: String, maxlength: 1000 },

    // The system's warranty verdict and the policy it was judged against
    // (docs/brand-crm §8). Informational: the brand makes the decision.
    warranty: {
      status: { type: String, enum: WARRANTY_STATUSES, default: 'Verification Required' },
      reasons: { type: [String], default: undefined },
      months: Number,
      expiresOn: Date,
      policy: { type: Mixed, default: null },
      verifiedBy: { type: actorSnapshotSchema, default: null },
      verifiedAt: Date,
      overrideNote: String,
    },
    // Set on approval: covered by the policy, or approved as goodwill.
    coverageDecision: { type: String, enum: [...COVERAGE_DECISIONS, null], default: null },

    documents: [documentSchema],
    address: { type: addressSnapshotSchema, required: true },

    status: { type: String, enum: CLAIM_STATUSES, default: CLAIM_STATUS.SUBMITTED, index: true },
    statusBeforeHold: { type: String, enum: [...CLAIM_STATUSES, null], default: null },
    rejectionReason: { type: String, default: null },
    rejectionCode: { type: String, enum: [...REJECTION_CODES, null], default: null },
    infoRequests: [infoRequestSchema],
    contactRequests: [contactRequestSchema],
    callbacks: [{ assignedTo: {type:ObjectId,ref:'User'}, dueAt:Date, remarks:String, createdBy:actorSnapshotSchema, completedAt:{type:Date,default:null}, notifiedAt:{type:Date,default:null} }],
    pendingReschedule: { date:String, slot:String, reason:String, status:{type:String,enum:['pending','accepted','declined']}, requestedBy:actorSnapshotSchema, requestedAt:Date, respondedAt:Date },
    firstCustomerContactAt: Date,
    holdReason: { type: String, default: null },
    heldBy: { type: actorSnapshotSchema, default: null },

    // The Service Job (ServiceRequest with an NCCJ humanId), once approved.
    serviceRequest: { type: ObjectId, ref: 'ServiceRequest', default: null, index: true },
    visit: { date: String, slot: String },
    // Detailed live stage of the NCC job (docs/brand-crm §4).
    jobStage: { type: String, enum: [...JOB_STAGES, null], default: null },
    jobStageAt: Date,
    allocation: { attempts: [{
      serviceRequest: { type: ObjectId, ref: 'ServiceRequest' },
      partner: { type: ObjectId, ref: 'ServiceProvider' }, partnerName: String,
      offeredAt: { type: Date, default: Date.now },
      outcome: { type: String, enum: ['accepted', 'declined', 'timeout', 'withdrawn', null], default: null },
      resolvedAt: Date, reason: String,
    }] },

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
      version: Number,
      hours: { response: Number, approval: Number, assignment: Number, visit: Number, resolution: Number },
      responseDueAt: Date,
      priorityFactor: Number,
      breachFacts: { type: mongoose.Schema.Types.Mixed, default: {} },
      brandApprovalDueAt: Date,
      assignmentDueAt: Date,
      visitDueAt: Date,
      resolutionDueAt: Date,
      met: { response: Date, brandApproval: Date, assignment: Date, visit: Date, resolution: Date },
      pausedAt: { type: Date, default: null },
      state: { type: String, enum: ['ok', 'warning', 'breached'], default: 'ok', index: true },
      warnings: [String],
      breaches: [String],
    },

    timeline: [timelineEventSchema],
    closure: {
      serviceReport: {
        summary: String,
        workDone: String,
        partsUsed: { type: [{ name: String, partNumber: String, qty: Number, _id: false }], default: undefined },
        photos: { type: [String], default: undefined },
      },
      customerConfirmedAt: Date,
      confirmationMethod: { type: String, enum: ['app', 'otp', 'cce', 'auto', null], default: null },
      rating: Number,
      feedback: String,
      closedAt: Date,
    },
    billingLine: { type: ObjectId, ref: 'BillingLine', default: null },
    firstBrandActionAt: Date,
    closedAt: Date,
    cancelledAt: Date,
  },
  // optimisticConcurrency: every save checks the version it read, so two
  // people deciding the same claim at once can't both win — the second save
  // fails with a VersionError (surfaced as 409 by the services).
  { timestamps: true, optimisticConcurrency: true },
);

warrantyClaimSchema.index({ 'sourceRef.apiKey': 1, 'sourceRef.externalId': 1 }, { unique: true, partialFilterExpression: { 'sourceRef.apiKey': { $type: 'objectId' }, 'sourceRef.externalId': { $type: 'string' } } });
warrantyClaimSchema.index({ brand: 1, createdAt: -1 });
warrantyClaimSchema.index({ brand: 1, closedAt: -1 });
warrantyClaimSchema.index({ brand: 1, 'timeline.action': 1, 'timeline.at': -1 });
warrantyClaimSchema.index({ brand: 1, serialNumber: 1, createdAt: -1 });
warrantyClaimSchema.index({ brand: 1, status: 1, createdAt: -1 });
warrantyClaimSchema.index({ brand: 1, customer: 1, createdAt: -1 });
warrantyClaimSchema.index({ customer: 1, createdAt: -1 });
warrantyClaimSchema.index({ status: 1, createdAt: -1 });
warrantyClaimSchema.index({ 'address.pincode': 1 });
warrantyClaimSchema.index({ brand: 1, serialNumber: 1 });
warrantyClaimSchema.index({ brand: 1, source: 1, createdAt: -1 });
warrantyClaimSchema.index({ brand: 1, 'customerSnapshot.phone': 1 });
warrantyClaimSchema.index(
  { brand: 1, brandTicketNo: 1 },
  { unique: true, partialFilterExpression: { brandTicketNo: { $type: 'string' } } },
);
warrantyClaimSchema.index({ brand: 1, jobStage: 1 });
warrantyClaimSchema.index({ 'assignedCce.user': 1, status: 1 });

brandScopeGuard(warrantyClaimSchema);
applyStandardPlugins(warrantyClaimSchema, { prefix: ID_PREFIXES.WARRANTY_TICKET });

export const WarrantyClaim = mongoose.models.WarrantyClaim || mongoose.model('WarrantyClaim', warrantyClaimSchema);
