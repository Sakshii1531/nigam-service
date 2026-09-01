import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const reviewSchema = new mongoose.Schema(
  {
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null, index: true },
    technicianRating: { type: Number, min: 1, max: 5 },
    platformRating: { type: Number, min: 1, max: 5 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    categoryRatings: {
      overall: Number,
      technicianBehavior: Number,
      serviceQuality: Number,
      timeliness: Number,
    },
    tags: [String],
    photos: [String],
    tip: { type: Number, default: 0 },
    comment: { type: String, default: '', trim: true },
    status: { type: String, enum: ['Reviewed', 'Responded', 'Escalated'], default: 'Reviewed', index: true },
    brandResponse: String,
  },
  { timestamps: true },
);

reviewSchema.index(
  { user: 1, booking: 1 },
  { unique: true, partialFilterExpression: { booking: { $exists: true, $ne: null } } }
);
reviewSchema.index(
  { user: 1, serviceRequest: 1 },
  { unique: true, partialFilterExpression: { serviceRequest: { $exists: true, $ne: null } } }
);

applyStandardPlugins(reviewSchema, { prefix: ID_PREFIXES.REVIEW });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
