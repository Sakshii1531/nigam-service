import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as adminTechnicianService from './adminTechnician.service.js';
import {
  listTechniciansQuerySchema,
  updateTechnicianStatusSchema,
  idParamSchema,
} from './adminTechnician.validation.js';

export const adminTechnicianRouter = Router();
adminTechnicianRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

adminTechnicianRouter.get('/', validate(listTechniciansQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await adminTechnicianService.listTechnicians(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

adminTechnicianRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await adminTechnicianService.getTechnician(req.params.id));
  } catch (err) {
    next(err);
  }
});

adminTechnicianRouter.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateTechnicianStatusSchema),
  async (req, res, next) => {
    try {
      ok(res, await adminTechnicianService.updateTechnicianStatus(req.params.id, req.body.status));
    } catch (err) {
      next(err);
    }
  },
);

adminTechnicianRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await adminTechnicianService.deleteTechnician(req.params.id));
  } catch (err) {
    next(err);
  }
});
