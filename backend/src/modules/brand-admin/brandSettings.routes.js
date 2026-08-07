import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import * as brandSettingsService from './brandSettings.service.js';
import { updateBrandSettingsSchema } from './brandSettings.validation.js';

export const brandSettingsRouter = Router();
brandSettingsRouter.use(requireAuth, requireBrandScope);

brandSettingsRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await brandSettingsService.getBrandSettings(req.user.brand));
  } catch (err) {
    next(err);
  }
});

brandSettingsRouter.put('/', validate(updateBrandSettingsSchema), async (req, res, next) => {
  try {
    ok(res, await brandSettingsService.updateBrandSettings(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});
