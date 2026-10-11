import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';

const masterServiceSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Installation', 'Repair', 'Maintenance', 'Inspection', 'Finishing'], required: true },
    charge: { type: Number, required: true },
  },
  { timestamps: true },
);

brandScopeGuard(masterServiceSchema);
applyStandardPlugins(masterServiceSchema);

export const MasterService = mongoose.models.MasterService || mongoose.model('MasterService', masterServiceSchema);
