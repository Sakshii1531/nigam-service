import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const teamSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true },
    department: { type: String, enum: ['Field Service', 'QA', 'Remote Support', 'Installation'], required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    region: String,
  },
  { timestamps: true },
);

applyStandardPlugins(teamSchema);

export const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
