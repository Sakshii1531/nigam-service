import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const partOrderSchema = new mongoose.Schema(
  {
    serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    partName: { type: String, required: true },
    sku: String,
    qty: { type: Number, default: 1 },
    price: Number,
    orderSource: { type: String, enum: ['NCC Warehouse', 'Partner Brand', 'Nearby Store'], required: true },
    // Two different real-world fulfilments need two different status ladders:
    // a part already sitting in the NCC warehouse just needs pulling and
    // handing over (no shipping leg), while one that has to be procured goes
    // through an actual dispatch/delivery. Conflating them under one ladder
    // meant "Dispatched"/"Delivered" got used for a part that was never
    // actually shipped anywhere.
    fulfillmentType: { type: String, enum: ['in_stock', 'procurement'], default: 'procurement' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Ready to Hand Over', 'Handed Over', 'Dispatched', 'Delivered', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    // The customer has to sign off on this part's cost before super-admin can
    // act on it at all — see booking.service.js's respondToPartRequest.
    customerApprovalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    customerRespondedAt: Date,
  },
  { timestamps: true },
);

applyStandardPlugins(partOrderSchema, { prefix: ID_PREFIXES.PART_REQUEST });

export const PartOrder = mongoose.models.PartOrder || mongoose.model('PartOrder', partOrderSchema);
