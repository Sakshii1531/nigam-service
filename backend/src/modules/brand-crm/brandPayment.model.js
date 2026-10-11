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
  invoice: {
    type: O,
    ref: 'BrandInvoice',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  mode: {
    type: String,
    enum: ['neft', 'rtgs', 'bank_transfer', 'upi', 'cheque', 'cash', 'other'],
    required: true
  },
  reference: {
    type: String,
    required: true,
    trim: true
  },
  receivedAt: {
    type: Date,
    required: true
  },
  note: String,
  recordedBy: {
    type: O,
    ref: 'User'
  }
}, {
  timestamps: true
});
schema.index({
  brand: 1,
  mode: 1,
  reference: 1
}, {
  unique: true
});
brandScopeGuard(schema);
applyStandardPlugins(schema);
export const BrandPayment = mongoose.models.BrandPayment || mongoose.model('BrandPayment', schema);
