import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as claimService from './claim.service.js';
import { listQuerySchema, updateStatusSchema, idParamSchema } from './claim.validation.js';

export const superAdminClaimRouter = Router();
superAdminClaimRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

superAdminClaimRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await claimService.listClaims(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

superAdminClaimRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await claimService.getClaim(req.params.id));
  } catch (err) {
    next(err);
  }
});

superAdminClaimRouter.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateStatusSchema), async (req, res, next) => {
  try {
    ok(res, await claimService.updateClaimStatus(req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
});
