import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const extendedWarrantyOrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appliance: String,
    brand: String,
    tierId: String,
    price: { type: Number, required: true },
    fullName: String,
    mobile: String,
    email: String,
    pincode: String,
    modelNumber: String,
    purchaseDate: Date,
    invoiceFileUrl: String,
    validTill: Date,
    status: { type: String, enum: ['Active', 'Expired'], default: 'Active', index: true },
    coverage: [String],
    terms: String,
    claimsRemaining: { type: Number, default: 0 },
    claimsTotal: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(extendedWarrantyOrderSchema, { prefix: ID_PREFIXES.EXTENDED_WARRANTY });

export const ExtendedWarrantyOrder =
  mongoose.models.ExtendedWarrantyOrder || mongoose.model('ExtendedWarrantyOrder', extendedWarrantyOrderSchema);
