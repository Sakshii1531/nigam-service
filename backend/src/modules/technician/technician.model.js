import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const skillSchema = new mongoose.Schema(
  { name: String, level: { type: String, enum: ['Expert', 'Advanced', 'Intermediate'] }, years: Number },
  { _id: false },
);

const certificationSchema = new mongoose.Schema(
  { name: String, issuer: String, date: Date, status: { type: String, enum: ['Verified', 'Pending'], default: 'Pending' } },
  { _id: false },
);

const payoutMethodSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['bank', 'upi'], required: true },
    name: String, // bank name or UPI label
    detail: String, // masked account/UPI id for display
    accountNo: { type: String, select: false },
    ifsc: String,
    holderName: String,
    upiId: String,
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const technicianSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true },
    phone: String,
    email: String,
    // Home address as entered on the technician's Personal Info screen.
    address: String,
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null, index: true },
    specs: [String], // active specializations, e.g. ['AC', 'Refrigerator', 'Washing Machine'] — drives job-feed filtering
    skills: [skillSchema],
    certifications: [certificationSchema],
    rating: { type: Number, default: 0 },
    activeJobsCount: { type: Number, default: 0 },
    completedJobsCount: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive', 'Pending'], default: 'Pending', index: true },
    availability: { type: String, enum: ['Available', 'Busy', 'Offline'], default: 'Offline', index: true },
    verification: {
      aadharStatus: { type: String, enum: ['Verified', 'Pending', 'Rejected'], default: 'Pending' },
      panStatus: { type: String, enum: ['Verified', 'Pending', 'Rejected'], default: 'Pending' },
      backgroundCheckStatus: { type: String, enum: ['Verified', 'Pending', 'Rejected'], default: 'Pending' },
      // Uploaded at registration; the console reviewer opens these to decide.
      aadharFrontUrl: String,
      aadharBackUrl: String,
    },
    // Weekly earnings goal shown on the Earnings screen. 0 means no target set,
    // in which case the app hides the progress card rather than inventing one.
    weeklyTargetAmount: { type: Number, default: 0 },
    trustScore: { type: Number, default: 0 },
    tier: { type: String, enum: ['TSP', 'SP', 'Senior SP'], default: 'TSP' }, // job-count-based ladder, recomputed in Phase 6 service layer
    servicePartner: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePartner', default: null, index: true },
    payoutMethods: [payoutMethodSchema],
    joinedAt: Date,
  },
  { timestamps: true },
);

applyStandardPlugins(technicianSchema, { prefix: ID_PREFIXES.TECHNICIAN });

export const Technician = mongoose.models.Technician || mongoose.model('Technician', technicianSchema);
