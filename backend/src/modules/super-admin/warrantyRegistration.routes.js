import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as warrantyRegistrationService from './warrantyRegistration.service.js';
import {
  listRegistrationsQuerySchema,
  updateVerificationSchema,
  idParamSchema,
} from './warrantyRegistration.validation.js';

export const warrantyRegistrationRouter = Router();
warrantyRegistrationRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

warrantyRegistrationRouter.get(
  '/',
  validate(listRegistrationsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { items, meta } = await warrantyRegistrationService.listRegistrations(req.query);
      ok(res, items, meta);
    } catch (err) {
      next(err);
    }
  },
);

warrantyRegistrationRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await warrantyRegistrationService.getRegistration(req.params.id));
  } catch (err) {
    next(err);
  }
});

warrantyRegistrationRouter.patch(
  '/:id/verification',
  validate(idParamSchema, 'params'),
  validate(updateVerificationSchema),
  async (req, res, next) => {
    try {
      ok(res, await warrantyRegistrationService.updateVerification(req.params.id, req.body, req.user.id));
    } catch (err) {
      next(err);
    }
  },
);
