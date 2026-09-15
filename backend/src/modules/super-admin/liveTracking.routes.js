import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { getAsmByUserId } from './asm.service.js';
import * as liveTrackingService from './liveTracking.service.js';
import { upsertTrackingSchema, jobIdParamSchema } from './liveTracking.validation.js';

// super_admin sees everything; asm (role-scoped access inside this same
// panel — see App.jsx's route guard) is confined to their own zone via
// scopeCityForCaller below. The manual-correction PUT stays super_admin
// only — that's an ops override, not part of an ASM's own zone view.
export const liveTrackingRouter = Router();
liveTrackingRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN, ROLES.ASM));

async function scopeCityForCaller(req) {
  if (req.user.role !== ROLES.ASM) return undefined;
  const asm = await getAsmByUserId(req.user.id);
  return asm.city?.id || asm.city?._id || asm.city;
}

liveTrackingRouter.get('/', async (req, res, next) => {
  try {
    const cityId = await scopeCityForCaller(req);
    ok(res, await liveTrackingService.listActiveTracking(cityId));
  } catch (err) {
    next(err);
  }
});

liveTrackingRouter.get('/:jobId', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const cityId = await scopeCityForCaller(req);
    ok(res, await liveTrackingService.getTrackingForJob(req.params.jobId, cityId));
  } catch (err) {
    next(err);
  }
});

liveTrackingRouter.put('/', requireRole(ROLES.SUPER_ADMIN), validate(upsertTrackingSchema), async (req, res, next) => {
  try {
    ok(res, await liveTrackingService.upsertTracking(req.body));
  } catch (err) {
    next(err);
  }
});
