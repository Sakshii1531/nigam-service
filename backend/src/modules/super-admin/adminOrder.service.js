import { Order } from '../buy-commerce/order.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Platform-wide order administration. The console was calling the
// customer-scoped GET /orders (which filters on `user: req.user.id`), so an
// admin saw only the orders they had personally placed — the same mistake the
// AMC console had.

export async function listOrders({ status, page, limit, sort } = {}) {
  const query = {};
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'name phone email')
      .populate('items.product', 'name imageUrl sku price category warrantyMonths')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Order.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getOrder(id) {
  const order = await Order.findById(id)
    .populate('user', 'name phone email')
    .populate('items.product', 'name imageUrl sku price category warrantyMonths');
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
}

// Fulfilment can only move forward, and a delivered or cancelled order is
// terminal — otherwise a mis-click could silently reopen a completed order.
const FORWARD = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];

export async function updateOrderStatus(id, status, { trackingNumber, courierPartner } = {}) {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');

  if (['Delivered', 'Cancelled'].includes(order.status)) {
    throw new ApiError(409, `Order is already ${order.status} and cannot be changed`);
  }
  if (status !== 'Cancelled' && FORWARD.indexOf(status) <= FORWARD.indexOf(order.status)) {
    throw new ApiError(400, `Cannot move an order from "${order.status}" to "${status}"`);
  }

  order.status = status;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (courierPartner !== undefined) order.courierPartner = courierPartner;
  await order.save();
  return order;
}

/**
 * Mark a COD order's payment as collected (Pending → Paid).
 * Also updates the linked Payment document so the transactions ledger stays
 * consistent — the Payment was created at 'Pending' when the COD order was placed.
 */
export async function updateOrderPaymentStatus(id, paymentStatus) {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentMethod !== 'COD') throw new ApiError(400, 'Payment status can only be changed for COD orders');
  if (order.paymentStatus === 'Paid') throw new ApiError(409, 'This order payment is already marked as Paid');

  order.paymentStatus = paymentStatus;
  await order.save();

  // Keep the Payment ledger in sync
  const payment = await Payment.findOne({ targetType: 'order', targetId: order._id });
  if (payment && payment.status !== 'Success') {
    payment.status = 'Success';
    await payment.save();
  }

  return order;
}
