import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { watchCatalogueWrites } from './catalogCache.js';

// One version of an offering's commercial numbers. Append-only: a price or
// payout change inserts a new version (rateWriter.createRateVersion) and closes
// the previous one's effectiveUntil — rows are never edited otherwise, which
// is what makes them the audit history, the effective-date schedule and the
// "catalogue/price version" a booking snapshots.
//
// All amounts are integer paise (money.js). `scope` is how location pricing
// will plug in later: only DEFAULT rows are written today, but the resolver
// already prefers PINCODE → CITY → DEFAULT, so turning it on needs no model change.

export const RATE_SCOPE_TYPES = Object.freeze(['DEFAULT', 'CITY', 'PINCODE']);
export const RATE_MONEY_FIELDS = Object.freeze(['customerPrice', 'spPayout', 'expressFee', 'expressSpIncentive']);

const paise = { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: '{PATH} must be whole paise' } };

const changeSchema = new mongoose.Schema(
  { field: { type: String, required: true }, from: { type: Number, default: null }, to: { type: Number, required: true } },
  { _id: false },
);

const offeringRateSchema = new mongoose.Schema(
  {
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceOffering', required: true },
    scope: {
      type: { type: String, enum: RATE_SCOPE_TYPES, default: 'DEFAULT' },
      // City name or pincode; null for DEFAULT.
      value: { type: String, default: null },
    },
    version: { type: Number, required: true, min: 1 },

    customerPrice: paise, // per unit
    spPayout: paise, // per unit — fixed, never derived from customerPrice
    expressFee: paise, // per booking
    expressSpIncentive: paise, // per booking

    effectiveFrom: { type: Date, required: true },
    effectiveUntil: { type: Date, default: null },

    changes: { type: [changeSchema], default: [] },
    reason: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

offeringRateSchema.index({ offering: 1, 'scope.type': 1, 'scope.value': 1, version: 1 }, { unique: true });
offeringRateSchema.index({ offering: 1, effectiveFrom: -1 });
offeringRateSchema.index({ createdAt: -1 });

applyStandardPlugins(offeringRateSchema);
// Writes drop the cached customer category trees (catalogCache.js).
offeringRateSchema.plugin(watchCatalogueWrites);

export const OfferingRate = mongoose.models.OfferingRate || mongoose.model('OfferingRate', offeringRateSchema);
