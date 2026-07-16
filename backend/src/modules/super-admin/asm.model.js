import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Area Service Manager — oversees ServicePartners in a city.
const asmSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    email: String,
    phone: String,
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    rating: { type: Number, default: 0 },
    partners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServicePartner' }],
  },
  { timestamps: true },
);

applyStandardPlugins(asmSchema);

export const ASM = mongoose.models.ASM || mongoose.model('ASM', asmSchema);
