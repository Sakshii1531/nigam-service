import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    category: String,
    status: { type: String, enum: ['Active', 'Pending'], default: 'Pending', index: true },
    // Base warranty this brand offers on its appliances, in months. Falls back
    // to the platform default when unset.
    warrantyMonths: Number,
    // Support contact shown on the brand profile. The console derived these
    // from the brand name ("support@<name>.com", "+91 1800 …") and displayed a
    // fixed joined date, so an operator could act on a mailbox and a number
    // that were never real.
    supportEmail: String,
    supportPhone: String,
    // Contracted SLA targets. Distinct from the measured actuals returned by
    // getBrandSla — these are what was agreed, not what happened.
    slaResolutionTimeHours: Number,
    slaAdherencePercent: Number,
    csat: Number,
    contractTerms: String,

    // ── Partner Warranty (docs/partner-warranty) ──
    logoUrl: { type: String, default: null },
    // Listed in the customer app's Partner Warranty flow only when true.
    warrantyEnabled: { type: Boolean, default: false, index: true },
    // Master Catalogue categories (the customer's "Product" step: AC,
    // Refrigerator, …) this brand accepts warranty claims for.
    coverage: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    // Stage deadlines in hours; unset → platform defaults.
    warrantySla: {
      responseHours: Number,
      priorityFactor: { Critical: Number, High: Number, Normal: Number, Low: Number },
      approvalHours: Number,
      assignmentHours: Number,
      visitHours: Number,
      resolutionHours: Number,
    },
    // ── Brand CRM (docs/brand-crm) ──
    // Prefix of the brand's own ticket numbers (LG-2026-000045). Derived from
    // the name when not given — see the pre-validate hook below.
    ticketPrefix: { type: String, uppercase: true, trim: true, match: /^[A-Z0-9]{2,6}$/, index: true },
    // What NCC bills the brand against (Phase 13). Unset gstPercent → platform default.
    billing: {
      gstin: String,
      legalName: String,
      billingAddress: String,
      gstPercent: Number,
      paymentTermsDays: { type: Number, default: 30 },
    },

    // Outgoing CRM webhook (Phase 10). The secret is never returned by reads.
    webhook: {
      url: String,
      secret: { type: String, select: false },
      enabled: { type: Boolean, default: false },
      events: [String],
    },
  },
  { timestamps: true },
);

/** 'LG' → LG, 'Samsung' → SAMS, 'Blue Star' → BLUES: the first word's first
 * four letters plus the initials of the rest, at most six characters. */
export function derivePrefix(name) {
  const words = String(name || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (!words.length) return 'BR';
  const prefix = (words[0].slice(0, 4) + words.slice(1).map((w) => w[0]).join('')).slice(0, 6);
  return prefix.length >= 2 ? prefix : `${prefix}X`;
}

// Every brand gets a ticket prefix, however it was created (Super Admin, the
// seed, a test). Best-effort unique: a clash gets a number (SAMS → SAMS2).
// Not a unique index — ticket numbers are unique per brand regardless, so a
// rare race between two new brands only costs readability, never correctness.
brandSchema.pre('validate', async function assignTicketPrefix() {
  if (this.ticketPrefix) return;
  const base = derivePrefix(this.name);
  const Model = this.constructor;
  for (let n = 1; n < 100; n += 1) {
    const candidate = n === 1 ? base : `${base.slice(0, 6 - String(n).length)}${n}`;
    const taken = await Model.exists({ ticketPrefix: candidate, _id: { $ne: this._id } });
    if (!taken) {
      this.ticketPrefix = candidate;
      return;
    }
  }
  this.ticketPrefix = `B${String(this._id).slice(-5).toUpperCase()}`;
});

applyStandardPlugins(brandSchema);

export const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);
