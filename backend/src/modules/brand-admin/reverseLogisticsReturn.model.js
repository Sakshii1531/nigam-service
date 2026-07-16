import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const reverseLogisticsReturnSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
    partName: { type: String, required: true },
    sku: String,
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null },
    replaceDate: Date,
    transitStatus: { type: String, enum: ['Replaced', 'In Transit', 'Delivered'], default: 'Replaced' },
    status: {
      type: String,
      enum: ['Pending Verification', 'Verified & Scrapped', 'Transit Damaged', 'Pending Return Shipment'],
      default: 'Pending Verification',
      index: true,
    },
    trackingNo: String,
    damageFlag: { type: Boolean, default: false },
  },
  { timestamps: true },
);

applyStandardPlugins(reverseLogisticsReturnSchema, { prefix: ID_PREFIXES.RETURN });

export const ReverseLogisticsReturn =
  mongoose.models.ReverseLogisticsReturn || mongoose.model('ReverseLogisticsReturn', reverseLogisticsReturnSchema);
