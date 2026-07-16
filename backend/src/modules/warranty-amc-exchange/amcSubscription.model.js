import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const amcSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'AMCPlan', required: true },
    appliance: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnedAppliance', default: null },
    brand: String,
    model: String,
    expiryDate: Date,
    status: { type: String, enum: ['Active', 'Expiring Soon', 'Expired'], default: 'Active', index: true },
    visitsTotal: { type: Number, required: true },
    visitsRemaining: { type: Number, required: true },
    visitNumber: { type: Number, default: 1 },
  },
  { timestamps: true },
);

applyStandardPlugins(amcSubscriptionSchema, { prefix: ID_PREFIXES.AMC });

export const AMCSubscription = mongoose.models.AMCSubscription || mongoose.model('AMCSubscription', amcSubscriptionSchema);
