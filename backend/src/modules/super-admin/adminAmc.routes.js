import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as adminAmcService from './adminAmc.service.js';

export const adminAmcRouter = Router();
adminAmcRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

const listQuerySchema = z.object({
  status: z.enum(['Active', 'Expiring Soon', 'Expired']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

adminAmcRouter.get('/subscriptions', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await adminAmcService.listSubscriptions(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

adminAmcRouter.get('/summary', async (req, res, next) => {
  try {
    ok(res, await adminAmcService.getSummary());
  } catch (err) {
    next(err);
  }
});
