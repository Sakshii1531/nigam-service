import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as servicePartnerService from './servicePartner.service.js';
import { createServicePartnerSchema, updateServicePartnerSchema, listQuerySchema, idParamSchema } from './servicePartner.validation.js';

export const servicePartnerRouter = Router();
servicePartnerRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

servicePartnerRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await servicePartnerService.listServicePartners(req.query));
  } catch (err) {
    next(err);
  }
});

servicePartnerRouter.post('/', validate(createServicePartnerSchema), async (req, res, next) => {
  try {
    created(res, await servicePartnerService.createServicePartner(req.body));
  } catch (err) {
    next(err);
  }
});

servicePartnerRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await servicePartnerService.getServicePartner(req.params.id));
  } catch (err) {
    next(err);
  }
});

servicePartnerRouter.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateServicePartnerSchema),
  async (req, res, next) => {
    try {
      ok(res, await servicePartnerService.updateServicePartner(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
