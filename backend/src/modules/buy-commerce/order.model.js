import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';
import { addressSchema } from '../auth/address.schema.js';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String, // snapshot — see Booking.service for the same reasoning
    price: Number,
    quantity: { type: Number, default: 1 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [orderItemSchema],
    address: addressSchema,
    exchangeRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeRequest', default: null },
    coinsRedeemed: { type: Number, default: 0 },
    // Pricing breakdown, all computed server-side (order.service.js) — never
    // trust a client-supplied total. subtotal - couponDiscount - exchangeDiscount
    // - coinsValue = total (floored at 0).
    subtotal: { type: Number, required: true },
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },
    exchangeDiscount: { type: Number, default: 0 },
    coinsValue: { type: Number, default: 0 },
    total: { type: Number, required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    status: {
      type: String,
      enum: ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Placed',
      index: true,
    },
  },
  { timestamps: true },
);

applyStandardPlugins(orderSchema, { prefix: ID_PREFIXES.ORDER });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
