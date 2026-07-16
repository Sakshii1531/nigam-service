import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const replacementApprovalSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    product: String,
    model: String,
    reason: String,
    techNotes: String,
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Info Requested'],
      default: 'Pending',
      index: true,
    },
  },
  { timestamps: true },
);

applyStandardPlugins(replacementApprovalSchema, { prefix: ID_PREFIXES.REPLACEMENT });

export const ReplacementApproval =
  mongoose.models.ReplacementApproval || mongoose.model('ReplacementApproval', replacementApprovalSchema);
