import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as platformUserService from './platformUser.service.js';
import { listUsersQuerySchema, updateStatusSchema, idParamSchema } from './platformUser.validation.js';

export const platformUserRouter = Router();
platformUserRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

platformUserRouter.get('/', validate(listUsersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await platformUserService.listUsers(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

platformUserRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await platformUserService.getUser(req.params.id));
  } catch (err) {
    next(err);
  }
});

platformUserRouter.get('/:id/service-receipt/:requestId', async (req, res, next) => {
  try {
    const html = await platformUserService.getServiceReceipt(req.params.id, req.params.requestId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

platformUserRouter.get('/:id/product-receipt/:orderId', async (req, res, next) => {
  try {
    const html = await platformUserService.getProductReceipt(req.params.id, req.params.orderId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

platformUserRouter.get('/:id/exchange-receipt/:exchangeId', async (req, res, next) => {
  try {
    const html = await platformUserService.getExchangeReceipt(req.params.id, req.params.exchangeId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

platformUserRouter.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateStatusSchema), async (req, res, next) => {
  try {
    ok(res, await platformUserService.updateUserStatus(req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
});

platformUserRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await platformUserService.closeUserAccount(req.params.id));
  } catch (err) {
    next(err);
  }
});
