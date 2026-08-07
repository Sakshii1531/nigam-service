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
    // What was actually disbursed on the last settlement. Recorded alongside
    // lastPaidAt because the payouts ledger reports an amount, not just a date,
    // and the balance is zeroed on settlement so it cannot be recovered after.
    lastPaidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending Approval', 'Paid'], default: 'Pending Approval', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(partnerPayoutSchema);

export const PartnerPayout = mongoose.models.PartnerPayout || mongoose.model('PartnerPayout', partnerPayoutSchema);
