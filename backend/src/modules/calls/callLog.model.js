import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Records every Twilio Voice relay attempt between a customer and technician.
// Both real phone numbers are stored server-side (never returned to clients);
// all REST responses return masked identifiers only.
const callLogSchema = new mongoose.Schema(
  {
    // Twilio's unique call SID — used to correlate the status webhook.
    callSid: { type: String, index: true, sparse: true },

    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: true,
      index: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },

    // Who pressed "Call" — determines which direction the relay dials first.
    initiatedBy: { type: String, enum: ['customer', 'technician'], required: true },

    status: {
      type: String,
      enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy', 'canceled'],
      default: 'initiated',
      index: true,
    },

    // Filled in by the Twilio status callback when the call ends.
    duration: { type: Number, default: null }, // seconds
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },

    // Twilio error code if the call failed — useful for debugging.
    errorCode: { type: String, default: null },
  },
  { timestamps: true },
);

applyStandardPlugins(callLogSchema);

export const CallLog = mongoose.models.CallLog || mongoose.model('CallLog', callLogSchema);
