import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Mongo-backed limits work across API processes; TTL only cleans expired windows.
const schema = new mongoose.Schema({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: Date,
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
applyStandardPlugins(schema);
export const IntakeWindow = mongoose.models.IntakeWindow || mongoose.model('IntakeWindow', schema);
