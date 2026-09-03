import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as adminOrderService from './adminOrder.service.js';
const PAYMENT_STATUSES = ['Pending', 'Paid'];

export const adminOrderRouter = Router();
adminOrderRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

const STATUSES = ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});
const idParamSchema = z.object({ id: z.string().length(24) });
const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
  trackingNumber: z.string().optional(),
  courierPartner: z.string().optional(),
});
const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
});

adminOrderRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await adminOrderService.listOrders(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

adminOrderRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await adminOrderService.getOrder(req.params.id));
  } catch (err) {
    next(err);
  }
});

adminOrderRouter.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateStatusSchema),
  async (req, res, next) => {
    try {
      ok(res, await adminOrderService.updateOrderStatus(req.params.id, req.body.status, req.body));
    } catch (err) {
      next(err);
    }
  },
);

adminOrderRouter.patch(
  '/:id/payment-status',
  validate(idParamSchema, 'params'),
  validate(updatePaymentStatusSchema),
  async (req, res, next) => {
    try {
      ok(res, await adminOrderService.updateOrderPaymentStatus(req.params.id, req.body.paymentStatus));
    } catch (err) {
      next(err);
    }
  },
);
