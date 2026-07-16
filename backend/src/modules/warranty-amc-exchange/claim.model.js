import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

// Raised by either a customer (extended-warranty/AMC/D2C claim) or a technician
// (FOC parts claim) — polymorphic via raisedByModel/refPath rather than two collections,
// since both flow through the same approve/reject pipeline (BACKEND_CONTEXT.md §3.7, §4.4).
const claimSchema = new mongoose.Schema(
  {
    raisedByModel: { type: String, enum: ['User', 'Technician'], required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'raisedByModel', index: true },
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null },
    brand: String, // e.g. "NCC Warehouse Order", "LG Partner Warranty", "NCC EW Claim"
    claimType: { type: String, enum: ['Brand', 'Extended Warranty', 'D2C', 'Warehouse Order'], default: 'D2C' },
    item: String,
    amount: { type: Number, required: true },
    reason: String,
    status: { type: String, enum: ['Pending Approval', 'Approved', 'Rejected'], default: 'Pending Approval', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(claimSchema, { prefix: ID_PREFIXES.CLAIM });

export const Claim = mongoose.models.Claim || mongoose.model('Claim', claimSchema);
