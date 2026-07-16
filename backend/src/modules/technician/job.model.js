import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES, JOB_STEPS, JOB_REVISIT_STEPS } from '../../config/constants.js';

// A technician "job" = a ServiceRequest joined with tech-facing metadata and the
// in-progress work state (diagnosis, proofs, billing, revisit). One Job per
// ServiceRequest (1:1) — kept as its own collection rather than bolted onto
// ServiceRequest because most of this only exists once a technician is engaged,
// and because the sub-documents below (diagnosis/proofs/billing/revisit) are only
// ever read/written together with the job, never independently (BACKEND_CONTEXT.md §4.2-4.3).

const amcMetaSchema = new mongoose.Schema(
  {
    planName: String,
    amcSubscription: { type: mongoose.Schema.Types.ObjectId, ref: 'AMCSubscription' },
    visitsTotal: Number,
    visitsRemaining: Number,
    visitNumber: Number,
    planExpiry: Date,
    planType: String,
  },
  { _id: false },
);

const ewMetaSchema = new mongoose.Schema(
  {
    planName: String,
    extendedWarrantyOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ExtendedWarrantyOrder' },
    validTill: Date,
    claimsRemaining: Number,
    claimsTotal: Number,
  },
  { _id: false },
);

const lineItemSchema = new mongoose.Schema(
  { name: String, price: Number, checked: { type: Boolean, default: false } },
  { _id: false },
);

const diagnosisSchema = new mongoose.Schema(
  {
    checklistActions: { type: Map, of: Boolean, default: {} },
    notes: String,
    photos: { product: String, serial: String, issue: String },
  },
  { _id: false },
);

const proofsSchema = new mongoose.Schema(
  {
    photosCount: { type: Number, default: 0 },
    videosCount: { type: Number, default: 0 },
    voiceNote: { type: Boolean, default: false },
    signatureUrl: { type: String, default: null },
    geoLocationCaptured: { type: Boolean, default: false },
  },
  { _id: false },
);

const revisitSchema = new mongoose.Schema(
  {
    expectedDate: Date,
    repairStatus: { type: String, enum: ['completed', 'unable', 'cancelled', null], default: null },
    reason: String,
    otp: String,
    signatureUrl: String,
    paymentMethod: { type: String, enum: ['upi', 'cash', 'card', 'wallet', null], default: null },
  },
  { _id: false },
);

const billingEstimateSchema = new mongoose.Schema(
  {
    serviceCharge: { type: Number, default: 0 },
    sparePartsTotal: { type: Number, default: 0 },
    additionalServicesTotal: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    total: { type: Number, default: 0 },
    technicianEarnings: { type: Number, default: 0 },
  },
  { _id: false },
);

const jobSchema = new mongoose.Schema(
  {
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, unique: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true, index: true },

    type: {
      type: String,
      enum: ['NCC Paid Service', 'Brand Warranty', 'NCC Extended Warranty', 'AMC Visit'],
      required: true,
    },
    isD2C: { type: Boolean, default: false },
    isPartner: { type: Boolean, default: false },
    isPriority: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false },
    isNccEw: { type: Boolean, default: false },

    estEarnings: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    distanceKm: Number,

    amc: amcMetaSchema,
    ew: ewMetaSchema,

    activeStep: {
      type: String,
      enum: [...JOB_STEPS, ...JOB_REVISIT_STEPS],
      default: 'idle',
      index: true,
    },

    diagnosis: diagnosisSchema,
    additionalServices: [lineItemSchema],
    spareParts: [{ ...lineItemSchema.obj, sku: String, source: { type: String, enum: ['recommended_ai', 'manual'] } }],
    proofs: proofsSchema,
    revisit: revisitSchema,
    billingEstimate: billingEstimateSchema,
  },
  { timestamps: true },
);

jobSchema.index({ technician: 1, activeStep: 1 });

applyStandardPlugins(jobSchema, { prefix: ID_PREFIXES.JOB });

export const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);
