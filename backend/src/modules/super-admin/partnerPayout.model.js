import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Payouts to a ServicePartner ("center"), distinct from technician-level Payout
// (src/modules/technician/payout.model.js) — different payee, different cadence.
const partnerPayoutSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePartner', required: true, index: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    balance: { type: Number, required: true },
    lastPaidAt: Date,
    status: { type: String, enum: ['Pending Approval', 'Paid'], default: 'Pending Approval', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(partnerPayoutSchema);

export const PartnerPayout = mongoose.models.PartnerPayout || mongoose.model('PartnerPayout', partnerPayoutSchema);
