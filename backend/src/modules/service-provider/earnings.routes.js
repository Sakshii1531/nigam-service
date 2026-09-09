import { Router } from 'express';
import { z } from 'zod';

const jobIdParamSchema = z.object({ jobId: z.string().min(1) });
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachTechnician } from '../../middleware/technician.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as earningsService from './earnings.service.js';
import { requestPayoutSchema, listPayoutsQuerySchema } from './earnings.validation.js';

export const earningsRouter = Router();
earningsRouter.use(requireAuth, requireRole(ROLES.TECHNICIAN), attachTechnician);

earningsRouter.get('/summary', async (req, res, next) => {
  try {
    ok(res, await earningsService.getEarningsSummary(req.technician.id));
  } catch (err) {
    next(err);
  }
});

earningsRouter.post('/payouts', validate(requestPayoutSchema), async (req, res, next) => {
  try {
    created(res, await earningsService.requestPayout(req.technician.id, req.body));
  } catch (err) {
    next(err);
  }
});

earningsRouter.get('/payouts', validate(listPayoutsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await earningsService.listPayouts(req.technician.id, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

earningsRouter.get('/recent', async (req, res, next) => {
  try {
    const { items, meta } = await earningsService.listRecentEarnings(req.technician.id, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().refine((n) => [7, 30, 90].includes(n), 'days must be 7, 30 or 90').optional(),
});

earningsRouter.get('/analytics', validate(analyticsQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await earningsService.getTechnicianAnalytics(req.technician.id, req.query));
  } catch (err) {
    next(err);
  }
});

earningsRouter.get('/breakdown', async (req, res, next) => {
  try {
    ok(res, await earningsService.getEarningsBreakdown(req.technician.id));
  } catch (err) {
    next(err);
  }
});

earningsRouter.post('/visit-fee/:jobId', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await earningsService.creditVisitFee(req.technician.id, req.params.jobId));
  } catch (err) {
    next(err);
  }
});
