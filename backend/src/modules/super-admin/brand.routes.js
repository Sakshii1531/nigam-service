import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as brandService from './brand.service.js';
import { createBrandSchema, updateBrandSchema, idParamSchema } from './brand.validation.js';

export const brandRouter = Router();
brandRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

brandRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await brandService.listBrands());
  } catch (err) {
    next(err);
  }
});

brandRouter.post('/', validate(createBrandSchema), async (req, res, next) => {
  try {
    created(res, await brandService.createBrand(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
});

brandRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await brandService.getBrand(req.params.id));
  } catch (err) {
    next(err);
  }
});

brandRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateBrandSchema), async (req, res, next) => {
  try {
    ok(res, await brandService.updateBrand(req.params.id, req.body, req.user.id));
  } catch (err) {
    next(err);
  }
});
