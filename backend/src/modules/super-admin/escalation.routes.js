import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as escalationService from './escalation.service.js';
import {
  createEscalationSchema,
  listQuerySchema,
  assignManagerSchema,
  updateStatusSchema,
  updatePrioritySchema,
  idParamSchema,
} from './escalation.validation.js';

export const escalationRouter = Router();
escalationRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

escalationRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await escalationService.listEscalations(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

escalationRouter.post('/', validate(createEscalationSchema), async (req, res, next) => {
  try {
    created(res, await escalationService.createEscalation(req.body));
  } catch (err) {
    next(err);
  }
});

escalationRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await escalationService.getEscalation(req.params.id));
  } catch (err) {
    next(err);
  }
});

escalationRouter.patch(
  '/:id/assign',
  validate(idParamSchema, 'params'),
  validate(assignManagerSchema),
  async (req, res, next) => {
    try {
      ok(res, await escalationService.assignManager(req.params.id, req.body.managerId));
    } catch (err) {
      next(err);
    }
  },
);

escalationRouter.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateStatusSchema),
  async (req, res, next) => {
    try {
      ok(res, await escalationService.updateStatus(req.params.id, req.body.status));
    } catch (err) {
      next(err);
    }
  },
);

escalationRouter.patch(
  '/:id/priority',
  validate(idParamSchema, 'params'),
  validate(updatePrioritySchema),
  async (req, res, next) => {
    try {
      ok(res, await escalationService.updatePriority(req.params.id, req.body.priority));
    } catch (err) {
      next(err);
    }
  },
);
