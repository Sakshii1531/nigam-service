import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
import { ID_PREFIXES } from '../../config/constants.js';
const O = mongoose.Schema.Types.ObjectId;
const schema = new mongoose.Schema({
  brand: {
    type: O,
    ref: 'Brand',
    required: true,
    index: true
  },
  periodFrom: {
    type: Date,
    required: true
  },
  periodTo: {
    type: Date,
    required: true
  },
  activePeriodKey: String,
  lines: [{
    type: O,
    ref: 'BillingLine'
  }],
  // Frozen charge details survive cancellation, release and subsequent rebilling.
  lineSnapshots: [mongoose.Schema.Types.Mixed],
  billingProfile: mongoose.Schema.Types.Mixed,
  issuer: mongoose.Schema.Types.Mixed,
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  gstAmount: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
    index: true
  },
  issuedAt: Date,
  dueDate: Date,
  cancelledAt: Date,
  cancellationReason: String,
  createdBy: {
    type: O,
    ref: 'User'
  },
  issuedBy: {
    type: O,
    ref: 'User'
  }
}, {
  timestamps: true,
  optimisticConcurrency: true
});
schema.index({
  activePeriodKey: 1
}, {
  unique: true,
  partialFilterExpression: {
    activePeriodKey: {
      $type: 'string'
    }
  }
});
schema.index({
  brand: 1,
  createdAt: -1
});
schema.index({brand:1,issuedAt:-1});
brandScopeGuard(schema);
applyStandardPlugins(schema, {
  prefix: ID_PREFIXES.BRAND_INVOICE
});
export const BrandInvoice = mongoose.models.BrandInvoice || mongoose.model('BrandInvoice', schema);
