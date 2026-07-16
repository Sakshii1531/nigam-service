import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const exchangeCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    badgeText: String,
    highlightColor: String,
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
    bonusAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(exchangeCampaignSchema);

export const ExchangeCampaign = mongoose.models.ExchangeCampaign || mongoose.model('ExchangeCampaign', exchangeCampaignSchema);
