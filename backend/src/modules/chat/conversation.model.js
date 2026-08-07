import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const conversationSchema = new mongoose.Schema(
  {
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null, index: true },
    // Set when a brand's support desk is a participant. A conversation is
    // either customer<->technician (job chat) or customer<->brand (support);
    // this field is what distinguishes them and what scopes the brand console's
    // list, so a brand can never see another's threads.
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    // A platform help-desk thread: the counterparty is super-admin rather than a
    // technician or a brand. Flagged rather than given a participant id because
    // the desk is the platform itself, not any particular account — whoever is
    // on duty answers from the same queue.
    platformSupport: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  },
  { timestamps: true },
);

applyStandardPlugins(conversationSchema);

export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
