import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
import { BRAND_DEPARTMENTS } from '../brand-crm/permissions.js';

export const TEAM_DEPARTMENTS = Object.freeze([...BRAND_DEPARTMENTS, 'Field Service', 'QA', 'Remote Support', 'Installation']);

const teamSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true },
    department: { type: String, enum: TEAM_DEPARTMENTS, required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    region: String,
  },
  { timestamps: true },
);

brandScopeGuard(teamSchema);
applyStandardPlugins(teamSchema);

export const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
