import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as assignmentWeightingService from './assignmentWeighting.service.js';
import { updateWeightingSchema } from './assignmentWeighting.validation.js';

export const assignmentWeightingRouter = Router();
assignmentWeightingRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

assignmentWeightingRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await assignmentWeightingService.getWeighting());
  } catch (err) {
    next(err);
  }
});

assignmentWeightingRouter.put('/', validate(updateWeightingSchema), async (req, res, next) => {
  try {
    ok(res, await assignmentWeightingService.updateWeighting(req.body));
  } catch (err) {
    next(err);
  }
});
