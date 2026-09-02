import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const featuredReviewSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    comment: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    authorName: { type: String, required: true, trim: true },
    theme: {
      type: String,
      enum: ['pink', 'purple', 'teal', 'amber'],
      default: 'pink',
    },
    isVisible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(featuredReviewSchema);

export const FeaturedReview =
  mongoose.models.FeaturedReview ||
  mongoose.model('FeaturedReview', featuredReviewSchema);
