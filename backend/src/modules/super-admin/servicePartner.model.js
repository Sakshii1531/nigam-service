import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// A "center" that employs technicians (Technician.servicePartner refs back here).
const servicePartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    manager: String,
    email: String,
    phone: String,
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    rating: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(servicePartnerSchema);

export const ServicePartner = mongoose.models.ServicePartner || mongoose.model('ServicePartner', servicePartnerSchema);
