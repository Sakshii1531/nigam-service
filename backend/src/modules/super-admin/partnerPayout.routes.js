import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as partnerPayoutService from './partnerPayout.service.js';
import {
  listPayoutsQuerySchema,
  createPayoutSchema,
  accrueSchema,
  idParamSchema,
} from './partnerPayout.validation.js';

export const partnerPayoutRouter = Router();
partnerPayoutRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

partnerPayoutRouter.get('/', validate(listPayoutsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await partnerPayoutService.listPartnerPayouts(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

// Declared before `/:id` so "summary" is never matched as an id.
partnerPayoutRouter.get('/summary', validate(listPayoutsQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await partnerPayoutService.getPayoutSummary(req.query));
  } catch (err) {
    next(err);
  }
});

partnerPayoutRouter.post('/', validate(createPayoutSchema), async (req, res, next) => {
  try {
    created(res, await partnerPayoutService.createPartnerPayout(req.body));
  } catch (err) {
    next(err);
  }
});

partnerPayoutRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await partnerPayoutService.getPartnerPayout(req.params.id));
  } catch (err) {
    next(err);
  }
});

partnerPayoutRouter.patch(
  '/:id/accrue',
  validate(idParamSchema, 'params'),
  validate(accrueSchema),
  async (req, res, next) => {
    try {
      ok(res, await partnerPayoutService.accrueBalance(req.params.id, req.body.amount));
    } catch (err) {
      next(err);
    }
  },
);

partnerPayoutRouter.patch('/:id/pay', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await partnerPayoutService.markPaid(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});
