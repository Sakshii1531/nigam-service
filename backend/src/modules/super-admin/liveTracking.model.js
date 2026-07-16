import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// One doc per active job's GPS feed — upserted on each location ping (Phase 9 socket
// handler), read by super-admin Tracking.jsx. Not append-only history; latest position only.
const liveTrackingSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true, index: true },
    status: { type: String, enum: ['On the way', 'Repairing', 'Completed'], default: 'On the way' },
    eta: String,
    location: String,
    coords: { lat: Number, lng: Number },
  },
  { timestamps: true },
);

applyStandardPlugins(liveTrackingSchema);

export const LiveTracking = mongoose.models.LiveTracking || mongoose.model('LiveTracking', liveTrackingSchema);
