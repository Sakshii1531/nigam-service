import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachServiceProvider } from '../../middleware/serviceProvider.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { scheduleVisit } from './partnerWarrantyJob.service.js';
import { partnerB2b2cSummary, listPartnerB2b2cJobs } from './b2b2cPayout.service.js';

// Partner app — /api/v1/service-provider/warranty-jobs (docs/partner-warranty Phase 7).
export const warrantyPartnerJobRouter = Router();
warrantyPartnerJobRouter.use(requireAuth, requireRole(ROLES.SERVICE_PROVIDER), attachServiceProvider);

const jobIdParams = z.object({ jobId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id') });
const scheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  slot: z.string().trim().min(1).max(40),
});

warrantyPartnerJobRouter.post('/:jobId/schedule-visit', validate(jobIdParams, 'params'), validate(scheduleSchema), async (req, res, next) => {
  try {
    ok(res, await scheduleVisit(req.serviceProvider.id, req.params.jobId, req.body));
  } catch (err) {
    next(err);
  }
});

// B2B2C earnings (Phase 11): totals by brand and product, and the job list.
// Static paths — registered after '/:jobId/…' is fine, they have no param.
warrantyPartnerJobRouter.get('/payouts', async (req, res, next) => {
  try {
    ok(res, await partnerB2b2cSummary(req.serviceProvider.id));
  } catch (err) {
    next(err);
  }
});
warrantyPartnerJobRouter.get('/payouts/jobs', validate(z.object({ status: z.enum(['settled', 'unsettled']).optional() }), 'query'), async (req, res, next) => {
  try {
    ok(res, await listPartnerB2b2cJobs(req.serviceProvider.id, req.query));
  } catch (err) {
    next(err);
  }
});
