import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const invoiceSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
    product: String,
    serviceCharge: { type: Number, default: 0 },
    partCharge: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ['Paid', 'Pending', 'Failed'], default: 'Pending', index: true },
  },
  { timestamps: true },
);

invoiceSchema.index({ brand: 1, status: 1, createdAt: -1 });

applyStandardPlugins(invoiceSchema, { prefix: ID_PREFIXES.INVOICE });

export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
