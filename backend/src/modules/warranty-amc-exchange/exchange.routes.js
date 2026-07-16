import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as exchangeService from './exchange.service.js';
import {
  valuateSchema,
  createExchangeRequestSchema,
  createQuestionSetSchema,
  idParamSchema,
  categoryParamSchema,
} from './exchange.validation.js';

export const exchangeRouter = Router();
exchangeRouter.use(requireAuth);

exchangeRouter.get('/question-sets/:category', validate(categoryParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await exchangeService.getQuestionSet(req.params.category));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.post(
  '/question-sets',
  requireRole(ROLES.SUPER_ADMIN),
  validate(createQuestionSetSchema),
  async (req, res, next) => {
    try {
      created(res, await exchangeService.createQuestionSet(req.body));
    } catch (err) {
      next(err);
    }
  },
);

exchangeRouter.post('/valuate', validate(valuateSchema), async (req, res, next) => {
  try {
    ok(res, await exchangeService.valuate(req.body));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.post('/requests', validate(createExchangeRequestSchema), async (req, res, next) => {
  try {
    created(res, await exchangeService.createExchangeRequest(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.get('/requests/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await exchangeService.getExchangeRequest(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});
