import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import * as cartService from './cart.service.js';
import { addItemSchema, productIdParamSchema } from './cart.validation.js';

export const cartRouter = Router();
cartRouter.use(requireAuth);

cartRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await cartService.getCart(req.user.id));
  } catch (err) {
    next(err);
  }
});

cartRouter.post('/items', validate(addItemSchema), async (req, res, next) => {
  try {
    ok(res, await cartService.addItem(req.user.id, req.body.productId, req.body.quantity));
  } catch (err) {
    next(err);
  }
});

cartRouter.delete('/items/:productId', validate(productIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await cartService.removeItem(req.user.id, req.params.productId));
  } catch (err) {
    next(err);
  }
});

cartRouter.delete('/', async (req, res, next) => {
  try {
    ok(res, await cartService.clearCart(req.user.id));
  } catch (err) {
    next(err);
  }
});
