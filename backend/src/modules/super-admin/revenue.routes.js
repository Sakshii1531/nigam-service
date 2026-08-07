import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as revenueService from './revenue.service.js';
import {
  listRevenueQuerySchema,
  createRevenueSchema,
  updateRevenueSchema,
  idParamSchema,
} from './revenue.validation.js';

export const revenueRouter = Router();
revenueRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

revenueRouter.get('/', validate(listRevenueQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await revenueService.listRevenue(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

// Declared before `/:id` so "summary" is never matched as an id.
revenueRouter.get('/summary', validate(listRevenueQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await revenueService.getRevenueSummary(req.query));
  } catch (err) {
    next(err);
  }
});

revenueRouter.post('/', validate(createRevenueSchema), async (req, res, next) => {
  try {
    created(res, await revenueService.createRevenue(req.body));
  } catch (err) {
    next(err);
  }
});

revenueRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await revenueService.getRevenue(req.params.id));
  } catch (err) {
    next(err);
  }
});

revenueRouter.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateRevenueSchema),
  async (req, res, next) => {
    try {
      ok(res, await revenueService.updateRevenue(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

revenueRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await revenueService.deleteRevenue(req.params.id));
  } catch (err) {
    next(err);
  }
});
