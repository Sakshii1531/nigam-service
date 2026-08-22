import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as configService from './servicePageConfig.service.js';
import {
  upsertServicePageConfigSchema,
  serviceKeyParamSchema,
} from './servicePageConfig.validation.js';

export const servicePageConfigRouter = Router();
const requireAdmin = [requireAuth, requireRole(ROLES.SUPER_ADMIN)];

// Public — the customer app renders service pages from these, no auth.
servicePageConfigRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await configService.listServicePageConfigs());
  } catch (err) {
    next(err);
  }
});

servicePageConfigRouter.get('/:serviceKey', validate(serviceKeyParamSchema, 'params'), async (req, res, next) => {
  try {
    // null, not 404: a service with no configured page is an ordinary state —
    // the customer app falls back to its built-in copy — and 404ing it made
    // every visit to a service page log a failed request. (This also returned a
    // bare { error } instead of the API's { data, error, meta } envelope.)
    ok(res, await configService.getServicePageConfig(req.params.serviceKey));
  } catch (err) {
    next(err);
  }
});

servicePageConfigRouter.put(
  '/:serviceKey',
  ...requireAdmin,
  validate(serviceKeyParamSchema, 'params'),
  validate(upsertServicePageConfigSchema),
  async (req, res, next) => {
    try {
      ok(res, await configService.upsertServicePageConfig(req.params.serviceKey, req.body));
    } catch (err) {
      next(err);
    }
  },
);

servicePageConfigRouter.delete(
  '/:serviceKey',
  ...requireAdmin,
  validate(serviceKeyParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await configService.deleteServicePageConfig(req.params.serviceKey));
    } catch (err) {
      next(err);
    }
  },
);
