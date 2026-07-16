import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const membershipSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Silver | Gold | Plus Gold | Diamond | Platinum
    price: { type: Number, required: true },
    benefits: [String],
    tierRank: { type: Number, required: true, unique: true }, // ordering, 1 = lowest
  },
  { timestamps: true },
);

applyStandardPlugins(membershipSchema);

export const Membership = mongoose.models.Membership || mongoose.model('Membership', membershipSchema);
