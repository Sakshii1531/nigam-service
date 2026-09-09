import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachTechnician } from '../../middleware/technician.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as claimService from './claim.service.js';
import { raiseClaimSchema, listClaimsQuerySchema, claimIdParamSchema } from './claim.validation.js';

// Manual FOC claims a technician raises directly (RaisePartRequest.jsx) —
// distinct from the auto-created claims job.service.js raises when spare parts
// are used on a warranty/AMC-covered job.
export const claimRouter = Router();
claimRouter.use(requireAuth, requireRole(ROLES.TECHNICIAN), attachTechnician);

claimRouter.post('/', validate(raiseClaimSchema), async (req, res, next) => {
  try {
    created(res, await claimService.raiseTechnicianClaim(req.technician.id, req.body));
  } catch (err) {
    next(err);
  }
});

claimRouter.get('/', validate(listClaimsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await claimService.listTechnicianClaims(req.technician.id, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

claimRouter.get('/:id', validate(claimIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await claimService.getTechnicianClaim(req.technician.id, req.params.id));
  } catch (err) {
    next(err);
  }
});
