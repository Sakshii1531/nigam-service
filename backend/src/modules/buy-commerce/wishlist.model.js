import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true },
);

wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

applyStandardPlugins(wishlistSchema);

export const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
