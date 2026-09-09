import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as adminServiceProviderService from './adminServiceProvider.service.js';
import { getAsmByUserId } from './asm.service.js';
import {
  listServiceProvidersQuerySchema,
  updateServiceProviderStatusSchema,
  idParamSchema,
} from './adminServiceProvider.validation.js';

export const adminServiceProviderRouter = Router();
// ASM as well as super-admin: an ASM manages the service providers in their
// own zone (verify/approve/suspend, view documents) — the same actions
// super-admin already had, just scoped. Delete stays super-admin-only below.
adminServiceProviderRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN, ROLES.ASM));

/**
 * An ASM's calls get pinned to their own zone; a super-admin's don't. Resolves
 * once per request rather than in the service layer so a bad/missing ASM
 * profile 404s here, before any query runs.
 */
async function scopeCityForCaller(req) {
  if (req.user.role !== ROLES.ASM) return undefined;
  const asm = await getAsmByUserId(req.user.id);
  return String(asm.city._id || asm.city);
}

adminServiceProviderRouter.get('/', validate(listServiceProvidersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const scopedCity = await scopeCityForCaller(req);
    const query = scopedCity ? { ...req.query, city: scopedCity } : req.query;
    const { items, meta } = await adminServiceProviderService.listServiceProviders(query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

adminServiceProviderRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const scopedCity = await scopeCityForCaller(req);
    ok(res, await adminServiceProviderService.getServiceProvider(req.params.id, scopedCity));
  } catch (err) {
    next(err);
  }
});

adminServiceProviderRouter.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateServiceProviderStatusSchema),
  async (req, res, next) => {
    try {
      const scopedCity = await scopeCityForCaller(req);
      ok(res, await adminServiceProviderService.updateServiceProviderStatus(req.params.id, req.body.status, scopedCity));
    } catch (err) {
      next(err);
    }
  },
);

adminServiceProviderRouter.delete(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await adminServiceProviderService.deleteServiceProvider(req.params.id));
    } catch (err) {
      next(err);
    }
  },
);
