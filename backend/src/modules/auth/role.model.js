import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Single collection for both platform-wide roles (super-admin's Roles.jsx) and
// brand-scoped roles (brand-admin's UserRoleManagement.jsx), disambiguated by
// `scope` + `brand`, rather than two near-identical collections — same isolation
// guarantee (query by scope+brand), less duplicated schema/CRUD code.
const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    scope: { type: String, enum: ['platform', 'brand'], required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
    icon: String,
    color: String,
  },
  { timestamps: true },
);

roleSchema.index({ name: 1, scope: 1, brand: 1 }, { unique: true });

applyStandardPlugins(roleSchema);

export const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
