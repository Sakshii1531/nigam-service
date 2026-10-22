import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
const schema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  invoiceNo: { type: String, required: true, unique: true },
  issuedAt: { type: Date, required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
applyStandardPlugins(schema);
schema.index({'snapshot.eInvoice.irn':1},{unique:true,partialFilterExpression:{'snapshot.eInvoice.irn':{$type:'string'}}});
export const CustomerInvoice = mongoose.models.CustomerInvoice || mongoose.model('CustomerInvoice', schema);
