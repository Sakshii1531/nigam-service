import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// A change to the city a service provider serves. Either the provider asks for
// it (source 'provider', starts Pending, a super-admin or the ASM of either
// city approves or rejects), or a super-admin changes it directly (source
// 'admin', recorded already Approved so the provider's history is complete).
const citySnapshotSchema = new mongoose.Schema(
  {
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    // Kept verbatim: the provider's city ref can be null (registration only
    // resolves it by exact name), and a City can later be renamed or removed.
    name: String,
    state: String,
  },
  { _id: false },
);

export const CITY_CHANGE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

const cityChangeRequestSchema = new mongoose.Schema(
  {
    serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true, index: true },
    fromCity: citySnapshotSchema,
    toCity: { type: citySnapshotSchema, required: true },
    reason: { type: String, default: '', trim: true },
    source: { type: String, enum: ['provider', 'admin'], required: true },
    status: { type: String, enum: CITY_CHANGE_STATUSES, default: 'Pending', index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

// One open request per provider — a second one would make "which city did
// they ask for" ambiguous for the reviewer.
cityChangeRequestSchema.index(
  { serviceProvider: 1 },
  { unique: true, partialFilterExpression: { status: 'Pending' }, name: 'one_pending_per_provider' },
);
cityChangeRequestSchema.index({ 'fromCity.city': 1, status: 1 });
cityChangeRequestSchema.index({ 'toCity.city': 1, status: 1 });

applyStandardPlugins(cityChangeRequestSchema);

export const CityChangeRequest =
  mongoose.models.CityChangeRequest || mongoose.model('CityChangeRequest', cityChangeRequestSchema);
