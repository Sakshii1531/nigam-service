import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as orderService from './order.service.js';
import { createOrderSchema, listOrdersQuerySchema, idParamSchema, verifyPaymentSchema } from './order.validation.js';

export const orderRouter = Router();
orderRouter.use(requireAuth);

orderRouter.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    created(res, await orderService.createOrder(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

orderRouter.get('/', validate(listOrdersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await orderService.listOrders(req.user.id, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

orderRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await orderService.getOrder(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

// Called by the frontend after Razorpay's Checkout.js reports success — see
// order.service.js's verifyOrderPayment() doc comment for why the order id
// used for signature verification comes from the server's own records, not
// anything in this request body.
orderRouter.post(
  '/:id/verify-payment',
  validate(idParamSchema, 'params'),
  validate(verifyPaymentSchema),
  async (req, res, next) => {
    try {
      ok(res, await orderService.verifyOrderPayment(req.user.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
