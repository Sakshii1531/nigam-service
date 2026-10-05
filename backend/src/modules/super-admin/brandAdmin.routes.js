import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as service from './brandAdmin.service.js';
import { createBrandAdminSchema, updateBrandAdminSchema, resetTemporaryPasswordSchema, listBrandAdminsQuerySchema, idParamSchema } from './brandAdmin.validation.js';

export const brandAdminRouter = Router();
brandAdminRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

brandAdminRouter.get('/', validate(listBrandAdminsQuerySchema, 'query'), async (req, res, next) => {
  try { ok(res, await service.listBrandAdmins(req.query)); } catch (err) { next(err); }
});
brandAdminRouter.post('/', validate(createBrandAdminSchema), async (req, res, next) => {
  try { created(res, await service.createBrandAdmin(req.body)); } catch (err) { next(err); }
});
brandAdminRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try { ok(res, await service.getBrandAdmin(req.params.id)); } catch (err) { next(err); }
});
brandAdminRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateBrandAdminSchema), async (req, res, next) => {
  try { ok(res, await service.updateBrandAdmin(req.params.id, req.body)); } catch (err) { next(err); }
});
brandAdminRouter.patch('/:id/temporary-password', validate(idParamSchema, 'params'), validate(resetTemporaryPasswordSchema), async (req, res, next) => {
  try { ok(res, await service.resetTemporaryPassword(req.params.id, req.body.temporaryPassword)); } catch (err) { next(err); }
});
