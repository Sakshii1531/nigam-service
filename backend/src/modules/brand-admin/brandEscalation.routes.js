import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as brandEscalationService from './brandEscalation.service.js';
import {
  listQuerySchema,
  createEscalationSchema,
  updateStatusSchema,
  idParamSchema,
} from './brandEscalation.validation.js';

export const brandEscalationRouter = Router();

brandEscalationRouter.use(requireAuth, requireBrandScope);

brandEscalationRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandEscalationService.listBrandEscalations(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandEscalationRouter.post('/', validate(createEscalationSchema), async (req, res, next) => {
  try {
    const escalation = await brandEscalationService.createBrandEscalation(req.user.brand, req.body);
    created(res, escalation);
  } catch (err) {
    next(err);
  }
});

brandEscalationRouter.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateStatusSchema), async (req, res, next) => {
  try {
    const escalation = await brandEscalationService.updateBrandEscalationStatus(req.user.brand, req.params.id, req.body.status);
    ok(res, escalation);
  } catch (err) {
    next(err);
  }
});
