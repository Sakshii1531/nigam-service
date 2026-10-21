import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
const O = mongoose.Schema.Types.ObjectId;
const schema = new mongoose.Schema({
  serviceProvider: { type: O, ref: 'ServiceProvider', required: true, index: true },
  user: { type: O, ref: 'User', required: true, index: true },
  checkoutKey: { type: String, required: true },
  checkoutFingerprint: String,
  humanId: { type: String, required: true, unique: true },
  items: [{ kit: { type: O, ref: 'ProviderKit', required: true }, sku: String, name: String, price: Number, shippingCharge: Number, quantity: Number, qualifiesForOnboarding: Boolean, _id: false }],
  recipient: { name: String, phone: String, house: String, landmark: String, city: String, state: String, pincode: String },
  subtotal: Number, shipping: Number, total: Number,
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'RefundPending', 'Refunded', 'PaymentReview'], default: 'Pending', index: true },
  status: { type: String, enum: ['AwaitingPayment', 'Processing', 'Packed', 'Shipped', 'Delivered', 'ReceiptVerified', 'Cancelled', 'Returned'], default: 'AwaitingPayment', index: true },
  payment: { type: O, ref: 'Payment' },
  gatewayOrderId: String,
  gatewayPaymentId: { type: String, unique: true, sparse: true },
  expiresAt: Date,
  stockReleased: { type: Boolean, default: false },
  courier: String, trackingNumber: String,
  receiptHash: { type: String, select: false },
  receiptCodeEncrypted: { type: String, select: false },
  receiptAttempts: { type: Number, default: 0 },
  receiptLockedUntil: Date,
  receiptVerifiedAt: Date,
  receiptExceptionReason: String,
  refundReference: String,
  events: [{ action: String, actor: { type: O, ref: 'User' }, at: { type: Date, default: Date.now }, message: String, _id: false }],
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ user: 1, checkoutKey: 1 }, { unique: true });
applyStandardPlugins(schema);
export const ProviderKitOrder = mongoose.models.ProviderKitOrder || mongoose.model('ProviderKitOrder', schema);
