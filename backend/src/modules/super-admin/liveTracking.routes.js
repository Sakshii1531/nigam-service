import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as liveTrackingService from './liveTracking.service.js';
import { upsertTrackingSchema, jobIdParamSchema } from './liveTracking.validation.js';

// Super-admin only for now — the real write path (a technician's live GPS ping)
// is Phase 9's Socket.IO handler, not this HTTP route. This is a read surface
// for super-admin's Tracking.jsx plus a manual-correction write, not the feed itself.
export const liveTrackingRouter = Router();
liveTrackingRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

liveTrackingRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await liveTrackingService.listActiveTracking());
  } catch (err) {
    next(err);
  }
});

liveTrackingRouter.get('/:jobId', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await liveTrackingService.getTrackingForJob(req.params.jobId));
  } catch (err) {
    next(err);
  }
});

liveTrackingRouter.put('/', validate(upsertTrackingSchema), async (req, res, next) => {
  try {
    ok(res, await liveTrackingService.upsertTracking(req.body));
  } catch (err) {
    next(err);
  }
});
