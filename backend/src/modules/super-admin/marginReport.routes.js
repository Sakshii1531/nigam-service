import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { marginReport } from './marginReport.service.js';

// NCC gross service margin — /api/v1/super-admin/reports/margin
// (docs/master-catalogue Phase 7). Super-admin only, like the catalogue it
// reports on: it exposes partner payouts and NCC margin.
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const marginQuerySchema = z.object({
  from: isoDay.optional(),
  to: isoDay.optional(),
  groupBy: z.enum(['category', 'offering', 'partner', 'day']).optional(),
  coverage: z.enum(['paid', 'covered', 'all']).optional(),
});

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

reportsRouter.get('/margin', validate(marginQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await marginReport(req.query));
  } catch (err) {
    next(err);
  }
});
