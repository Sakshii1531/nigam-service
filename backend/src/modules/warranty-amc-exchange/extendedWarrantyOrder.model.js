import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const extendedWarrantyOrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appliance: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnedAppliance', default: null },
    applianceCategory: String, // e.g. "AC" — display label, kept even once `appliance` is linked
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
    // Coverage lifecycle — independent of the invoice check below.
    status: { type: String, enum: ['Active', 'Expired'], default: 'Active', index: true },
    // Whether the gateway actually collected the price. The policy used to be
    // created and shown as covered with no payment record of any kind.
    paid: { type: Boolean, default: false, index: true },
    // Back-office check that the uploaded dealer invoice is genuine
    // (WarrantyVerification.jsx). Separate from `status` because a registration
    // can be within its coverage window and still be awaiting verification.
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    verifiedAt: Date,
    verificationNote: String,
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
