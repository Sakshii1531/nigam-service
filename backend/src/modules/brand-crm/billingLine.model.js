import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
const O = mongoose.Schema.Types.ObjectId;
const schema = new mongoose.Schema({
  brand: {
    type: O,
    ref: 'Brand',
    required: true,
    index: true
  },
  ticket: {
    type: O,
    ref: 'WarrantyClaim',
    required: true,
    index: true
  },
  serviceJob: {
    type: O,
    ref: 'ServiceRequest'
  },
  ticketNo: String,
  jobNo: String,
  state: String,
  city: String,
  categoryKey: String,
  serviceType: String,
  coverageDecision: String,
  completedAt: Date,
  closedAt: Date,
  rate: {
    id: {
      type: O,
      ref: 'BrandRate'
    },
    amount: {
      type: Number,
      min: 0
    },
    matchedOn: {
      type: String,
      enum: ['city', 'state', 'national', 'missing']
    }
  },
  parts: [{
    partOrder: {
      type: O,
      ref: 'PartOrder'
    },
    name: String,
    partNumber: String,
    qty: Number,
    amount: Number
  }],
  otherCharges: [{
    label: String,
    amount: Number,
    reason: String,
    addedBy: {
      type: O,
      ref: 'User'
    },
    at: {
      type: Date,
      default: Date.now
    }
  }],
  subtotal: Number,
  gstPercent: Number,
  gstAmount: Number,
  total: Number,
  flags: [String],
  status: {
    type: String,
    enum: ['pending_closure', 'billable', 'invoiced', 'void'],
    default: 'pending_closure'
  },
  invoice: {
    type: O,
    ref: 'BrandInvoice',
    default: null
  },
  voidReason: String,
  activeKey: String
}, {
  timestamps: true,
  optimisticConcurrency: true
});
schema.index({
  activeKey: 1
}, {
  unique: true,
  partialFilterExpression: {
    activeKey: {
      $type: 'string'
    }
  }
});
schema.index({brand:1,completedAt:-1});
schema.index({brand:1,state:1,city:1,completedAt:-1});
brandScopeGuard(schema);
applyStandardPlugins(schema);
export const BillingLine = mongoose.models.BillingLine || mongoose.model('BillingLine', schema);
