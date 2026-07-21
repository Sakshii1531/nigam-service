import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES, SERVICE_REQUEST_STATUS } from '../../config/constants.js';

const timelineStepSchema = new mongoose.Schema(
  {
    stepLabel: { type: String, required: true },
    done: { type: Boolean, default: false },
    timestamp: Date,
    description: String,
  },
  { _id: false },
);

// The central complaint/ticket entity — referenced by Invoices, Reviews, Documents,
// Escalations, ReverseLogisticsReturn, ServiceCompletionMonitor (BACKEND_CONTEXT.md §3.6, §5).
const serviceRequestSchema = new mongoose.Schema(
  {
    // humanId (from applyStandardPlugins) carries the SR-#### platform ID.
    brandTicketNo: { type: String, index: true, sparse: true }, // brand's own numbering, e.g. SOM-GKP-YYMMDD-######

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    appliance: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnedAppliance', default: null },
    amcSubscription: { type: mongoose.Schema.Types.ObjectId, ref: 'AMCSubscription', default: null },
    extendedWarrantyOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ExtendedWarrantyOrder', default: null },

    category: String,
    model: String,
    serialNo: String,
    complaintType: {
      type: String,
      enum: ['Breakdown', 'No Power', 'Noise', 'Performance', 'Physical Damage', 'Intermittent'],
    },
    description: String,
    priority: { type: String, enum: ['Critical', 'High', 'P1', 'P2', 'Medium', 'P3', 'Low'], default: 'Medium' },
    warranty: { type: String, enum: ['In Warranty', 'Out of Warranty'], default: 'Out of Warranty' },
    invoiceAvailable: { type: Boolean, default: false },
    attachments: [String],
    requestMode: { type: String, enum: ['B2B', 'B2C'], default: 'B2C' },

    status: { type: String, enum: SERVICE_REQUEST_STATUS, default: 'New', index: true },
    timeline: [timelineStepSchema],

    slaDueAt: Date,
    zone: String,
  },
  { timestamps: true },
);

serviceRequestSchema.index({ brand: 1, status: 1, createdAt: -1 });
serviceRequestSchema.index({ technician: 1, status: 1 });

applyStandardPlugins(serviceRequestSchema, { prefix: ID_PREFIXES.SERVICE_REQUEST });

export const ServiceRequest = mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', serviceRequestSchema);
