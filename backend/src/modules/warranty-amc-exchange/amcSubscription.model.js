import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';
import { Brand } from '../super-admin/brand.model.js';

const amcSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'AMCPlan', required: true },
    appliance: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnedAppliance', default: null },
    applianceCategory: String,
    brand: String,
    brandRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    model: String,
    installationDate: Date,
    pincode: String,
    invoiceFileUrl: String,
    expiryDate: Date,
    status: { type: String, enum: ['Active', 'Expiring Soon', 'Expired'], default: 'Active', index: true },
    // Same reasoning as ExtendedWarrantyOrder.paid — a subscription was granted
    // its full visit allowance without a rupee changing hands.
    paid: { type: Boolean, default: false, index: true },
    visitsTotal: { type: Number, required: true },
    visitsRemaining: { type: Number, required: true },
    visitNumber: { type: Number, default: 1 },
  },
  { timestamps: true },
);

amcSubscriptionSchema.pre('validate', async function resolveBrandRef() {
  if (this.brandRef || !this.brand) return;
  const brand = await Brand.findOne({ name: String(this.brand).trim() })
    .collation({ locale: 'en', strength: 2 }).select('_id').lean();
  this.brandRef = brand?._id || null;
});

applyStandardPlugins(amcSubscriptionSchema, { prefix: ID_PREFIXES.AMC });

export const AMCSubscription = mongoose.models.AMCSubscription || mongoose.model('AMCSubscription', amcSubscriptionSchema);
