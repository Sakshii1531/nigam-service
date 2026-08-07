import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as brandActionsService from './brandActions.service.js';

export const brandActionsRouter = Router();
brandActionsRouter.use(requireAuth, requireBrandScope);

const idParamSchema = z.object({ id: z.string().length(24) });

const notifySchema = z.object({
  userId: z.string().length(24),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(1000),
});

const scheduleVisitSchema = z.object({ scheduledDate: z.coerce.date() });

brandActionsRouter.post('/notify-customer', validate(notifySchema), async (req, res, next) => {
  try {
    created(res, await brandActionsService.notifyCustomer(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

brandActionsRouter.post(
  '/amc/:id/renewal-reminder',
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await brandActionsService.sendRenewalReminder(req.user.brand, req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

brandActionsRouter.post(
  '/amc/:id/visits',
  validate(idParamSchema, 'params'),
  validate(scheduleVisitSchema),
  async (req, res, next) => {
    try {
      created(res, await brandActionsService.scheduleVisit(req.user.brand, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
