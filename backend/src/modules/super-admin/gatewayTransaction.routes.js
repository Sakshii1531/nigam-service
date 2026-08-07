import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as gatewayTransactionService from './gatewayTransaction.service.js';
import {
  listTransactionsQuerySchema,
  createTransactionSchema,
  idParamSchema,
} from './gatewayTransaction.validation.js';

export const gatewayTransactionRouter = Router();
gatewayTransactionRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

gatewayTransactionRouter.get('/', validate(listTransactionsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await gatewayTransactionService.listGatewayTransactions(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

// Declared before `/:id` so "summary" is never matched as an id.
gatewayTransactionRouter.get('/summary', validate(listTransactionsQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await gatewayTransactionService.getTransactionSummary(req.query));
  } catch (err) {
    next(err);
  }
});

gatewayTransactionRouter.post('/', validate(createTransactionSchema), async (req, res, next) => {
  try {
    created(res, await gatewayTransactionService.createGatewayTransaction(req.body));
  } catch (err) {
    next(err);
  }
});

gatewayTransactionRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await gatewayTransactionService.getGatewayTransaction(req.params.id));
  } catch (err) {
    next(err);
  }
});

gatewayTransactionRouter.patch('/:id/refund', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await gatewayTransactionService.refundTransaction(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});
