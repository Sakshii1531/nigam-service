import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachTechnician } from '../../middleware/technician.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as technicianService from './technician.service.js';
import { updateProfileSchema, addPayoutMethodSchema, methodIdParamSchema } from './technician.validation.js';

export const technicianRouter = Router();
technicianRouter.use(requireAuth, requireRole(ROLES.TECHNICIAN), attachTechnician);

technicianRouter.get('/profile', async (req, res, next) => {
  try {
    ok(res, await technicianService.getProfile(req.technician.id));
  } catch (err) {
    next(err);
  }
});

technicianRouter.put('/profile', validate(updateProfileSchema), async (req, res, next) => {
  try {
    ok(res, await technicianService.updateProfile(req.technician.id, req.body));
  } catch (err) {
    next(err);
  }
});

technicianRouter.post('/payout-methods', validate(addPayoutMethodSchema), async (req, res, next) => {
  try {
    ok(res, await technicianService.addPayoutMethod(req.technician.id, req.body));
  } catch (err) {
    next(err);
  }
});

technicianRouter.delete('/payout-methods/:methodId', validate(methodIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await technicianService.removePayoutMethod(req.technician.id, req.params.methodId));
  } catch (err) {
    next(err);
  }
});
