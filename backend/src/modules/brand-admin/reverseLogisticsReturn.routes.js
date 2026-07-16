import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as returnService from './reverseLogisticsReturn.service.js';
import { createReturnSchema, updateReturnSchema, listQuerySchema, idParamSchema } from './reverseLogisticsReturn.validation.js';

export const reverseLogisticsReturnRouter = Router();
reverseLogisticsReturnRouter.use(requireAuth, requireBrandScope);

reverseLogisticsReturnRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await returnService.listReturns(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

reverseLogisticsReturnRouter.post('/', validate(createReturnSchema), async (req, res, next) => {
  try {
    created(res, await returnService.createReturn(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

reverseLogisticsReturnRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await returnService.getReturn(req.user.brand, req.params.id));
  } catch (err) {
    next(err);
  }
});

reverseLogisticsReturnRouter.patch('/:id', validate(idParamSchema, 'params'), validate(updateReturnSchema), async (req, res, next) => {
  try {
    ok(res, await returnService.updateReturn(req.user.brand, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});
