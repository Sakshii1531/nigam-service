import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const schema = new mongoose.Schema({
  key: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true, index: true },
  url: { type: String, required: true },
}, { timestamps: true });
applyStandardPlugins(schema);
export const IntakeUpload = mongoose.models.IntakeUpload || mongoose.model('IntakeUpload', schema);
