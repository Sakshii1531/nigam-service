import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import * as rateCardService from './rateCard.service.js';
import { upsertRateCardSchema, idParamSchema } from './rateCard.validation.js';

export const rateCardRouter = Router();
rateCardRouter.use(requireAuth, requireBrandScope);

rateCardRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await rateCardService.listRateCards(req.user.brand));
  } catch (err) {
    next(err);
  }
});

rateCardRouter.put('/', validate(upsertRateCardSchema), async (req, res, next) => {
  try {
    ok(res, await rateCardService.upsertRateCard(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

rateCardRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await rateCardService.deleteRateCard(req.user.brand, req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
