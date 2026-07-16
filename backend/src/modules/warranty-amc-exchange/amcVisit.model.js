import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const amcVisitSchema = new mongoose.Schema(
  {
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'AMCSubscription', required: true, index: true },
    visitNumber: { type: Number, required: true },
    scheduledDate: Date,
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
    status: { type: String, enum: ['Scheduled', 'Completed', 'Missed'], default: 'Scheduled' },
    tasks: [{ label: String, done: Boolean, note: String, urgent: Boolean }],
    notes: String,
  },
  { timestamps: true },
);

applyStandardPlugins(amcVisitSchema);

export const AMCVisit = mongoose.models.AMCVisit || mongoose.model('AMCVisit', amcVisitSchema);
