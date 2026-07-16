import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// A customer's registered appliance instance — referenced by Bookings and
// ServiceRequests, and read by warrantyEngine (Phase 2) to compute warrantyStatus.
const ownedApplianceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true },
    brand: String,
    model: String,
    modelNumber: String,
    serialNumber: String,
    purchaseDate: Date,
    invoiceFileUrl: String,
    dealer: String,
    // Cached result of warrantyEngine's last computation — recomputed on read where it matters,
    // this field just avoids recomputing on every list-page render.
    warrantyStatus: {
      type: String,
      enum: ['In Warranty', 'Out of Warranty', 'Extended Warranty', 'AMC'],
      default: 'Out of Warranty',
    },
  },
  { timestamps: true },
);

ownedApplianceSchema.index({ user: 1, category: 1 });

applyStandardPlugins(ownedApplianceSchema);

export const OwnedAppliance = mongoose.models.OwnedAppliance || mongoose.model('OwnedAppliance', ownedApplianceSchema);
