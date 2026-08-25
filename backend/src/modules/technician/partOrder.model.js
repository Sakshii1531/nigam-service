import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const partOrderSchema = new mongoose.Schema(
  {
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    partName: { type: String, required: true },
    sku: String,
    qty: { type: Number, default: 1 },
    price: Number,
    orderSource: { type: String, enum: ['NCC Warehouse', 'Partner Brand', 'Nearby Store'], required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Dispatched', 'Delivered', 'Rejected'], default: 'Pending', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(partOrderSchema, { prefix: ID_PREFIXES.PART_REQUEST });

export const PartOrder = mongoose.models.PartOrder || mongoose.model('PartOrder', partOrderSchema);
