import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
import { ID_PREFIXES } from '../../config/constants.js';

const partOrderSchema = new mongoose.Schema(
  {
    serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    warrantyClaim: { type: mongoose.Schema.Types.ObjectId, ref: 'WarrantyClaim', index: true },
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest' },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', index: true },
    partNumber: String,
    approval: { required: [{ type: String, enum: ['brand','ncc'] }], brand: { status: String, by: mongoose.Schema.Types.Mixed, at: Date, remarks: String }, ncc: { status: String, by: mongoose.Schema.Types.Mixed, at: Date, remarks: String } },
    payer: { type: String, enum: ['brand','customer','ncc'] },
    receivedAt: Date, installedAt: Date, installPhotoUrl: String,
    statusHistory: [{ status: String, at: { type: Date, default: Date.now }, actor: mongoose.Schema.Types.Mixed }],
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
      enum: ['Pending', 'Approved', 'Ready to Hand Over', 'Handed Over', 'Dispatched', 'Delivered', 'Received', 'Installed', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    // The customer has to sign off on this part's cost before super-admin can
    // act on it at all — see booking.service.js's respondToPartRequest.
    customerApprovalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    customerRespondedAt: Date,
  },
  { timestamps: true, optimisticConcurrency: true },
);

// Keep the tenant reference on the row itself. This also covers legacy callers
// that only supplied a Job id; the relationship is resolved once at write time.
partOrderSchema.pre('validate', async function resolveBrand() {
  if (this.brand || !this.job) return;
  const Job = mongoose.models.Job;
  const ServiceRequest = mongoose.models.ServiceRequest;
  if (!Job || !ServiceRequest) return;
  const job = await Job.findById(this.job).select('serviceRequest').lean();
  if (!job?.serviceRequest) return;
  const request = await ServiceRequest.findById(job.serviceRequest).select('brand').lean();
  this.brand = request?.brand || null;
});

brandScopeGuard(partOrderSchema);
applyStandardPlugins(partOrderSchema, { prefix: ID_PREFIXES.PART_REQUEST });

export const PartOrder = mongoose.models.PartOrder || mongoose.model('PartOrder', partOrderSchema);
