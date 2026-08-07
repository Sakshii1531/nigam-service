import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as billingService from './billingTransaction.service.js';
import {
  listBillingQuerySchema,
  createBillingSchema,
  updateBillingStatusSchema,
  idParamSchema,
} from './billingTransaction.validation.js';

export const billingTransactionRouter = Router();
billingTransactionRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

billingTransactionRouter.get('/', validate(listBillingQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await billingService.listBillingTransactions(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

// Declared before `/:id` so "summary" is never matched as an id.
billingTransactionRouter.get('/summary', validate(listBillingQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await billingService.getBillingSummary(req.query));
  } catch (err) {
    next(err);
  }
});

billingTransactionRouter.post('/', validate(createBillingSchema), async (req, res, next) => {
  try {
    created(res, await billingService.createBillingTransaction(req.body));
  } catch (err) {
    next(err);
  }
});

billingTransactionRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await billingService.getBillingTransaction(req.params.id));
  } catch (err) {
    next(err);
  }
});

billingTransactionRouter.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateBillingStatusSchema),
  async (req, res, next) => {
    try {
      ok(res, await billingService.updateBillingStatus(req.params.id, req.body.status, req.user.id));
    } catch (err) {
      next(err);
    }
  },
);
