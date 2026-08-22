import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as adminPartOrderService from './adminPartOrder.service.js';

const PART_ORDER_STATUSES = ['Pending', 'Approved', 'Dispatched', 'Rejected'];

const listQuerySchema = z.object({
  status: z.enum(PART_ORDER_STATUSES).optional(),
  orderSource: z.enum(['NCC Warehouse', 'Partner Brand', 'Nearby Store']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

const updateStatusSchema = z.object({
  status: z.enum(PART_ORDER_STATUSES),
  scheduledDate: z.string().optional(),
  timeSlot: z.string().optional(),
  notes: z.string().optional(),
});

export const adminPartOrderRouter = Router();
adminPartOrderRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

adminPartOrderRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await adminPartOrderService.listPartOrders(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

adminPartOrderRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateStatusSchema),
  async (req, res, next) => {
    try {
      ok(res, await adminPartOrderService.updatePartOrderStatus(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
