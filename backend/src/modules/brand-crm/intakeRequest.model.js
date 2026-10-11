import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
const schema = new mongoose.Schema({
  key: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  externalId: { type: String, required: true }, bodyHash: { type: String, required: true },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'WarrantyClaim' }, response: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
schema.index({ key: 1, externalId: 1 }, { unique: true });
applyStandardPlugins(schema);
export const IntakeRequest = mongoose.models.IntakeRequest || mongoose.model('IntakeRequest', schema);
