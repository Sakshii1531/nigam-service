import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
export const INTAKE_SCOPES = ['tickets:create', 'tickets:read', 'catalog:read', 'uploads:create'];
const schema = new mongoose.Schema({
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
  name: { type: String, required: true }, prefix: { type: String, required: true, unique: true },
  hash: { type: String, required: true, select: false },
  scopes: [{ type: String, enum: INTAKE_SCOPES }],
  allowedSources: [{ type: String, enum: ['whatsapp', 'api'] }],
  rateLimit: { type: Number, default: 60, min: 1, max: 600 },
  lastUsedAt: Date, revokedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
brandScopeGuard(schema);
applyStandardPlugins(schema);
export const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', schema);
