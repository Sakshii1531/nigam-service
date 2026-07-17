import mongoose from 'mongoose';
import { Order } from './order.model.js';
import { Product } from './product.model.js';
import { Cart } from './cart.model.js';
import { decrementStock } from './product.service.js';
import { resolveCoupon } from '../rewards-loyalty/coupon.service.js';
import { getExchangeRequest, markApplied } from '../warranty-amc-exchange/exchange.service.js';
import { redeemCoins, creditCoins } from '../payments-wallet/wallet.service.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../payments-wallet/paymentGateway.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

const COINS_PER_RUPEE = 10; // 10 Nigam Coins = ₹1 (BACKEND_CONTEXT.md §3.10)

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function resolveLineItems({ userId, items, useCart }) {
  if (useCart) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) throw new ApiError(400, 'Cart is empty');
    items = cart.items.map((i) => ({ productId: String(i.product), quantity: i.quantity }));
  }
  if (!items || items.length === 0) throw new ApiError(400, 'No items to order');

  const resolved = [];
  for (const { productId, quantity } of items) {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) throw new ApiError(404, `Product ${productId} not found`);
    resolved.push({ product, quantity });
  }
  return resolved;
}

/**
 * Checkout — prices everything server-side (subtotal from the catalog, coupon
 * and exchange discounts resolved and clamped here, coin redemption capped at
 * what's actually owed) and persists an immutable breakdown on the Order.
 *
 * NOT a multi-document Mongo transaction (see DATA_MODEL.md Phase 5 addendum —
 * the local dev mongod is standalone, not a replica set). Each side effect
 * (stock decrement, coin debit, payment) is individually atomic at the
 * single-document level; if a later step fails, earlier steps are compensated
 * (stock/coins credited back) on a best-effort basis rather than guaranteed
 * atomically — a real gap this accepts for now, not a silent one.
 *
 * Two payment paths (post-Phase-15, real Razorpay integration):
 *  - total <= 0 (fully covered by discounts/coins), or paymentMethod === 'Cash'
 *    (in-person/COD, no gateway involved at all): completes synchronously,
 *    same as before — Order created 'Confirmed', exchange marked applied,
 *    cart cleared immediately.
 *  - total > 0 and a real gateway method (Card/UPI/NetBanking/Wallet): no
 *    legitimate gateway lets a server charge a customer with zero customer
 *    interaction, so this creates a Razorpay Order + a 'Pending' Payment and
 *    returns Order status 'Placed' plus the Razorpay checkout details the
 *    frontend needs to open Checkout.js. Exchange-marking and cart-clearing
 *    are deferred to verifyOrderPayment() below — an abandoned/failed
 *    checkout must not consume the trade-in credit or empty the customer's cart.
 *
 * KNOWN GAP: stock and redeemed coins are reserved at this step regardless of
 * which path is taken, and there's no automatic release if a gateway checkout
 * is abandoned (as opposed to failing outright, which the try/catch below does
 * compensate). A real fix needs a TTL/cron sweep for stale 'Placed' orders —
 * flagged in DATA_MODEL.md rather than silently left unhandled.
 */
export async function createOrder(userId, { items, useCart, address, couponCode, exchangeRequestId, coinsToRedeem = 0, paymentMethod = 'UPI' }) {
  const lineItems = await resolveLineItems({ userId, items, useCart });

  const orderItems = lineItems.map(({ product, quantity }) => ({
    product: product._id,
    name: product.name,
    price: product.price,
    quantity,
  }));
  const subtotal = round2(orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0));

  let remaining = subtotal;

  let coupon = null;
  let couponDiscount = 0;
  if (couponCode) {
    coupon = await resolveCoupon(couponCode);
    couponDiscount = round2(Math.min(coupon.discount, remaining));
    remaining = round2(remaining - couponDiscount);
  }

  let exchangeRequest = null;
  let exchangeDiscount = 0;
  if (exchangeRequestId) {
    exchangeRequest = await getExchangeRequest(userId, exchangeRequestId);
    if (exchangeRequest.appliedToOrder) throw new ApiError(400, 'Exchange request has already been applied to an order');
    // Security: a trade-in's estimatedValue is entirely self-reported by the
    // customer at valuation time — without this check it was a free discount
    // nobody ever verified. Only a super-admin's physical inspection
    // (exchangeRequest.routes.js PATCH /:id/status) can advance the status.
    if (exchangeRequest.status !== 'Inspection Approved') {
      throw new ApiError(400, 'This exchange request has not been approved after inspection yet');
    }
    exchangeDiscount = round2(Math.min(exchangeRequest.estimatedValue, remaining));
    remaining = round2(remaining - exchangeDiscount);
  }

  // Cap the coin redemption at what's actually still owed — never redeem more
  // value than needed to zero out the order.
  let coinsValue = 0;
  let actualCoinsRedeemed = 0;
  if (coinsToRedeem > 0) {
    const requestedValue = coinsToRedeem / COINS_PER_RUPEE;
    coinsValue = round2(Math.min(requestedValue, remaining));
    actualCoinsRedeemed = Math.round(coinsValue * COINS_PER_RUPEE);
    remaining = round2(remaining - coinsValue);
  }

  const total = Math.max(0, remaining);
  const needsGateway = total > 0 && paymentMethod !== 'Cash';

  // Riskiest-first ordering: coin redemption can fail on insufficient balance,
  // so do it before the harder-to-cleanly-reverse stock decrements.
  if (actualCoinsRedeemed > 0) {
    await redeemCoins(userId, actualCoinsRedeemed, { reason: 'redeemed' });
  }

  const decrementedProducts = [];
  try {
    for (const item of orderItems) {
      await decrementStock(item.product, item.quantity);
      decrementedProducts.push(item);
    }

    // Payment.targetId is required, so it can't be created before the Order it
    // targets exists — pre-generate the Order's _id so both documents can
    // cross-reference each other from creation instead of a two-phase update.
    const orderId = new mongoose.Types.ObjectId();

    let payment;
    let razorpayCheckout = null;

    if (needsGateway) {
      const razorpayOrder = await createRazorpayOrder({
        amount: total,
        receipt: `order_${orderId}`,
        notes: { orderId: String(orderId), userId },
      });
      payment = await Payment.create({
        user: userId,
        targetType: 'order',
        targetId: orderId,
        amount: total,
        method: paymentMethod,
        status: 'Pending',
        gatewayRef: razorpayOrder.id,
        coinsRedeemed: actualCoinsRedeemed,
      });
      razorpayCheckout = { orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency, keyId: env.razorpay.keyId };
    } else {
      payment = await Payment.create({
        user: userId,
        targetType: 'order',
        targetId: orderId,
        amount: total,
        method: paymentMethod,
        status: 'Success',
        gatewayRef: null,
        coinsRedeemed: actualCoinsRedeemed,
      });
    }

    const order = await Order.create({
      _id: orderId,
      user: userId,
      items: orderItems,
      address,
      exchangeRequest: exchangeRequest ? exchangeRequest._id : null,
      coinsRedeemed: actualCoinsRedeemed,
      subtotal,
      couponCode: coupon ? coupon.code : null,
      couponDiscount,
      exchangeDiscount,
      coinsValue,
      total,
      payment: payment._id,
      status: needsGateway ? 'Placed' : 'Confirmed',
      checkedOutFromCart: Boolean(useCart),
    });

    if (!needsGateway) {
      if (exchangeRequest) await markApplied(exchangeRequest._id, order._id);
      if (useCart) await Cart.updateOne({ user: userId }, { items: [] });
    }
    // needsGateway === true: exchange-marking and cart-clearing happen in
    // verifyOrderPayment() once the customer actually completes Checkout.

    return { ...order.toJSON(), razorpay: razorpayCheckout };
  } catch (err) {
    // Best-effort compensation — see the function-level note on why this isn't
    // a guaranteed-atomic rollback.
    await Promise.all(decrementedProducts.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })));
    if (actualCoinsRedeemed > 0) await creditCoins(userId, actualCoinsRedeemed, { reason: 'refund' });
    throw err;
  }
}

async function findOwnedOr404(userId, id) {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (String(order.user) !== userId) throw new ApiError(403, 'Not authorized to view this order');
  return order;
}

export async function getOrder(userId, id) {
  return findOwnedOr404(userId, id);
}

export async function listOrders(userId, { status, page, limit, sort } = {}) {
  const query = { user: userId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Order.find(query).sort(sortObj).skip(skip).limit(lim),
    Order.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * Confirms an Order's Razorpay Checkout payment. The Razorpay order id used
 * for signature verification comes from the server's own Pending Payment
 * record, never from the client — see paymentGateway.js's verifyRazorpaySignature
 * doc comment for why trusting a client-supplied order id would allow a
 * signature replay from an unrelated payment.
 */
export async function verifyOrderPayment(userId, orderId, { razorpayPaymentId, razorpaySignature }) {
  const order = await findOwnedOr404(userId, orderId);
  if (order.status !== 'Placed') throw new ApiError(400, `Order is not awaiting payment (status: ${order.status})`);

  const payment = await Payment.findOne({ targetType: 'order', targetId: order._id, status: 'Pending' });
  if (!payment) throw new ApiError(400, 'No pending payment found for this order');

  const valid = verifyRazorpaySignature({ orderId: payment.gatewayRef, paymentId: razorpayPaymentId, signature: razorpaySignature });
  if (!valid) throw new ApiError(400, 'Payment signature verification failed');

  payment.status = 'Success';
  payment.razorpayPaymentId = razorpayPaymentId;
  await payment.save();

  order.status = 'Confirmed';
  await order.save();

  if (order.exchangeRequest) await markApplied(order.exchangeRequest, order._id);
  if (order.checkedOutFromCart) await Cart.updateOne({ user: userId }, { items: [] });

  return order;
}
