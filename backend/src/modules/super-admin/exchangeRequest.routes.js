import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as exchangeService from '../warranty-amc-exchange/exchange.service.js';
import {
  listExchangeRequestsQuerySchema,
  updateExchangeRequestStatusSchema,
  idParamSchema,
} from '../warranty-amc-exchange/exchange.validation.js';

// Physical-inspection workflow for trade-ins — see exchange.service.js's
// admin-surface comment for why this exists (Phase 11 security fix).
export const superAdminExchangeRequestRouter = Router();
superAdminExchangeRequestRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

superAdminExchangeRequestRouter.get('/', validate(listExchangeRequestsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await exchangeService.listExchangeRequestsAdmin(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

superAdminExchangeRequestRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await exchangeService.getExchangeRequestAdmin(req.params.id));
  } catch (err) {
    next(err);
  }
});

superAdminExchangeRequestRouter.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateExchangeRequestStatusSchema),
  async (req, res, next) => {
    try {
      ok(res, await exchangeService.updateExchangeRequestStatus(req.params.id, req.body.status));
    } catch (err) {
      next(err);
    }
  },
);
