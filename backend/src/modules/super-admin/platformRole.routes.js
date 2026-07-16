import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as platformRoleService from './platformRole.service.js';
import { createRoleSchema, updateRoleSchema, idParamSchema } from './platformRole.validation.js';

export const platformRoleRouter = Router();
platformRoleRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

platformRoleRouter.get('/permissions', async (req, res, next) => {
  try {
    ok(res, await platformRoleService.listPermissions());
  } catch (err) {
    next(err);
  }
});

platformRoleRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await platformRoleService.listRoles());
  } catch (err) {
    next(err);
  }
});

platformRoleRouter.post('/', validate(createRoleSchema), async (req, res, next) => {
  try {
    created(res, await platformRoleService.createRole(req.body));
  } catch (err) {
    next(err);
  }
});

platformRoleRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateRoleSchema), async (req, res, next) => {
  try {
    ok(res, await platformRoleService.updateRole(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

platformRoleRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await platformRoleService.deleteRole(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
