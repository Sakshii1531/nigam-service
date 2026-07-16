import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const conversationSchema = new mongoose.Schema(
  {
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null, index: true },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  },
  { timestamps: true },
);

applyStandardPlugins(conversationSchema);

export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
