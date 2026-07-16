import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const reviewSchema = new mongoose.Schema(
  {
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    categoryRatings: {
      overall: Number,
      technicianBehavior: Number,
      serviceQuality: Number,
      timeliness: Number,
    },
    tags: [String],
    photos: [String],
    tip: { type: Number, default: 0 },
    comment: String,
    status: { type: String, enum: ['Reviewed', 'Responded', 'Escalated'], default: 'Reviewed', index: true },
    brandResponse: String,
  },
  { timestamps: true },
);

applyStandardPlugins(reviewSchema, { prefix: ID_PREFIXES.REVIEW });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
