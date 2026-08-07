import { Order } from '../buy-commerce/order.model.js';
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
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Order.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getOrder(id) {
  const order = await Order.findById(id).populate('user', 'name phone email');
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
