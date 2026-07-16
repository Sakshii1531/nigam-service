import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import * as wishlistService from './wishlist.service.js';
import { productIdParamSchema } from './cart.validation.js';

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await wishlistService.listWishlist(req.user.id));
  } catch (err) {
    next(err);
  }
});

wishlistRouter.post('/:productId', validate(productIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await wishlistService.addToWishlist(req.user.id, req.params.productId));
  } catch (err) {
    next(err);
  }
});

wishlistRouter.delete('/:productId', validate(productIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await wishlistService.removeFromWishlist(req.user.id, req.params.productId));
  } catch (err) {
    next(err);
  }
});
