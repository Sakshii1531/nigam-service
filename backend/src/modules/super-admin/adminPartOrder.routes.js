import { mutationAudit } from '../brand-crm/auditMutations.js';
import { actorFromUser } from '../brand-crm/actor.js';
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as adminPartOrderService from './adminPartOrder.service.js';

const PART_ORDER_STATUSES = ['Pending', 'Approved', 'Ready to Hand Over', 'Handed Over', 'Dispatched', 'Delivered', 'Received', 'Installed', 'Rejected'];

const listQuerySchema = z.object({
  status: z.enum(PART_ORDER_STATUSES).optional(),
  brandApproval: z.enum(['Pending','Approved','Rejected','Not Required']).optional(),
  orderSource: z.enum(['NCC Warehouse', 'Partner Brand', 'Nearby Store']).optional(),
  fulfillmentType: z.enum(['in_stock', 'procurement']).optional(),
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
adminPartOrderRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN), mutationAudit({admin:true,prefix:'/part-orders'}));

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
      ok(res, await adminPartOrderService.updatePartOrderStatus(req.params.id, req.body, await actorFromUser(req.user.id, 'admin')));
    } catch (err) {
      next(err);
    }
  },
);
