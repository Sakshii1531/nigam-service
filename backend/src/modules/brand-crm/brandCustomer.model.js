import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Explicit CRM relationship, independent of having raised a ticket or job.
const schema = new mongoose.Schema({
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
schema.index({ brand: 1, customer: 1 }, { unique: true });
applyStandardPlugins(schema);
export const BrandCustomer = mongoose.models.BrandCustomer || mongoose.model('BrandCustomer', schema);
