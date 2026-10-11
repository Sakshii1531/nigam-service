import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { actorFromReq } from '../brand-crm/actor.js';
import * as brandUserService from './brandUser.service.js';
import { inviteBrandUserSchema, updateBrandUserSchema, idParamSchema } from './brandUser.validation.js';

export const brandUserRouter = Router();
brandUserRouter.use(requireAuth, requireBrandScope);

brandUserRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await brandUserService.listBrandUsers(req.user.brand));
  } catch (err) {
    next(err);
  }
});

brandUserRouter.post('/', validate(inviteBrandUserSchema), async (req, res, next) => {
  try {
    created(res, await brandUserService.inviteBrandUser(req.user.brand, req.body, await actorFromReq(req)));
  } catch (err) {
    next(err);
  }
});

brandUserRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await brandUserService.getBrandUser(req.user.brand, req.params.id));
  } catch (err) {
    next(err);
  }
});

brandUserRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateBrandUserSchema), async (req, res, next) => {
  try {
    ok(res, await brandUserService.updateBrandUser(req.user.brand, req.params.id, req.body, await actorFromReq(req)));
  } catch (err) {
    next(err);
  }
});
