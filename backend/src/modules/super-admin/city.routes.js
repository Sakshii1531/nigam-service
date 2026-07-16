import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as cityService from './city.service.js';
import { createCitySchema, updateCitySchema, idParamSchema } from './city.validation.js';

export const cityRouter = Router();
cityRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

cityRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await cityService.listCities());
  } catch (err) {
    next(err);
  }
});

cityRouter.post('/', validate(createCitySchema), async (req, res, next) => {
  try {
    created(res, await cityService.createCity(req.body));
  } catch (err) {
    next(err);
  }
});

cityRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await cityService.getCity(req.params.id));
  } catch (err) {
    next(err);
  }
});

cityRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateCitySchema), async (req, res, next) => {
  try {
    ok(res, await cityService.updateCity(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});
