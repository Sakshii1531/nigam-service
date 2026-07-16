import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// One cart doc per user with embedded line items — items are always read/written
// together with the cart, never queried independently, so embedding beats a
// separate CartItem collection here (unlike Wishlist, which is a pure many-to-many).
const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
  },
  { timestamps: true },
);

applyStandardPlugins(cartSchema);

export const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
