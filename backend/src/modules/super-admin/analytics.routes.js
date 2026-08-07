import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { z } from 'zod';
import * as analyticsService from './analytics.service.js';

const reportsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// The dashboard offers a 7- and 30-day window; anything else is not a view the
// UI can render, so it is rejected rather than silently clamped.
const revenueTrendQuerySchema = z.object({
  days: z.coerce.number().int().refine((n) => n === 7 || n === 30, 'days must be 7 or 30').optional(),
});

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

analyticsRouter.get('/dashboard', async (req, res, next) => {
  try {
    ok(res, await analyticsService.getDashboard());
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/reports', validate(reportsQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await analyticsService.getReports(req.query));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/revenue-trend', validate(revenueTrendQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await analyticsService.getRevenueTrend(req.query));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/request-trend', validate(revenueTrendQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await analyticsService.getRequestTrend(req.query));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/retention', async (req, res, next) => {
  try {
    ok(res, await analyticsService.getRetention());
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/coin-redemption', async (req, res, next) => {
  try {
    ok(res, await analyticsService.getCoinRedemption());
  } catch (err) {
    next(err);
  }
});
