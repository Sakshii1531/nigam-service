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
    // 'Placed' now doubles as "awaiting Razorpay Checkout confirmation" when a
    // real gateway charge is needed (total > 0 and paymentMethod isn't Cash) —
    // order.service.js's verifyOrderPayment() is what moves it to 'Confirmed'.
    // Tracks whether this order emptied the cart (vs an explicit items array)
    // so verifyOrderPayment() only clears it when that's actually correct —
    // checkout that's still pending shouldn't clear a cart the customer might
    // still be editing, and an items-array checkout never touched the cart at all.
    status: {
      type: String,
      enum: ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Placed',
      index: true,
    },
    checkedOutFromCart: { type: Boolean, default: false },
    // Recorded by the admin console when an order ships. It used to generate a
    // "TRK-EXP-<random>" number and the courier name "Express Logistics" in the
    // browser, so a customer could be given a tracking id that tracks nothing.
    trackingNumber: String,
    courierPartner: String,
  },
  { timestamps: true },
);

applyStandardPlugins(orderSchema, { prefix: ID_PREFIXES.ORDER });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
