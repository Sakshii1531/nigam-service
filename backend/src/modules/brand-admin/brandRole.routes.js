import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as brandRoleService from './brandRole.service.js';
import { createRoleSchema, updateRoleSchema, idParamSchema } from './brandRole.validation.js';

export const brandRoleRouter = Router();
brandRoleRouter.use(requireAuth, requireBrandScope);

brandRoleRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await brandRoleService.listRoles(req.user.brand));
  } catch (err) {
    next(err);
  }
});

brandRoleRouter.post('/', validate(createRoleSchema), async (req, res, next) => {
  try {
    created(res, await brandRoleService.createRole(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

brandRoleRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateRoleSchema), async (req, res, next) => {
  try {
    ok(res, await brandRoleService.updateRole(req.user.brand, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

brandRoleRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await brandRoleService.deleteRole(req.user.brand, req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
