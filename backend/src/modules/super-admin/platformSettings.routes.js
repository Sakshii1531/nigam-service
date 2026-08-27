import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as platformSettingsService from './platformSettings.service.js';
import { updateSettingsSchema } from './platformSettings.validation.js';

export const platformSettingsRouter = Router();

platformSettingsRouter.get('/public', async (req, res, next) => {
  try {
    ok(res, await platformSettingsService.getPublicSettings());
  } catch (err) {
    next(err);
  }
});

platformSettingsRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

platformSettingsRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await platformSettingsService.getSettings());
  } catch (err) {
    next(err);
  }
});

platformSettingsRouter.put('/', validate(updateSettingsSchema), async (req, res, next) => {
  try {
    ok(res, await platformSettingsService.updateSettings(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
});
