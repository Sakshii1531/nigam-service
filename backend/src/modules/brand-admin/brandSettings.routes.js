import { getSlaSettings, updateSlaSettings, getMatrix, updateMatrix, slaSchema, matrixSchema } from '../brand-crm/slaSettings.service.js';
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

for (const [path, schema, read, write] of [
  ['/sla', slaSchema, getSlaSettings, updateSlaSettings],
  ['/escalation-matrix', matrixSchema, getMatrix, updateMatrix],
]) {
  brandSettingsRouter.get(path, async (req, res, next) => {
    try { ok(res, await read(req.user.brand)); } catch (e) { next(e); }
  });
  brandSettingsRouter.put(path, validate(schema), async (req, res, next) => {
    try { ok(res, await write(req.user, req.body)); } catch (e) { next(e); }
  });
}
