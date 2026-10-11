import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as brandEscalationService from './brandEscalation.service.js';
import {
  listQuerySchema,
  createEscalationSchema,
  updateStatusSchema,
  idParamSchema, updateEscalationSchema, resolveSchema,
} from './brandEscalation.validation.js';

export const brandEscalationRouter = Router();

brandEscalationRouter.use(requireAuth, requireBrandScope);

brandEscalationRouter.get('/assignees', async (req, res, next) => {
  try { ok(res, await brandEscalationService.escalationAssignees(req.user.brand)); } catch (e) { next(e); }
});
brandEscalationRouter.get('/open-count', async (req, res, next) => {
  try {
    ok(res, { count: await brandEscalationService.countOpenBrandEscalations(req.user.brand) });
  } catch (err) {
    next(err);
  }
});

brandEscalationRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandEscalationService.listBrandEscalations(req.user.brand, req.query, req.user.id);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandEscalationRouter.post('/', validate(createEscalationSchema), async (req, res, next) => {
  try {
    const escalation = await brandEscalationService.createBrandEscalation(req.user.brand, req.body, req.user.id);
    created(res, escalation);
  } catch (err) {
    next(err);
  }
});

brandEscalationRouter.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateStatusSchema), async (req, res, next) => {
  try {
    const escalation = await brandEscalationService.updateBrandEscalationStatus(req.user.brand, req.params.id, req.body.status, req.user.id);
    ok(res, escalation);
  } catch (err) {
    next(err);
  }
});

brandEscalationRouter.patch('/:id', validate(idParamSchema, 'params'), validate(updateEscalationSchema), async (req, res, next) => {
  try { ok(res, await brandEscalationService.updateBrandEscalation(req.user.brand, req.params.id, req.body, req.user.id)); } catch (e) { next(e); }
});
brandEscalationRouter.post('/:id/resolve', validate(idParamSchema, 'params'), validate(resolveSchema), async (req, res, next) => {
  try { ok(res, await brandEscalationService.updateBrandEscalation(req.user.brand, req.params.id, req.body, req.user.id)); } catch (e) { next(e); }
});
