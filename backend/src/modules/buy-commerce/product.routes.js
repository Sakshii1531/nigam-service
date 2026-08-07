import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as productService from './product.service.js';
import { listProductsQuerySchema, createProductSchema, updateProductSchema, idParamSchema } from './product.validation.js';

export const productRouter = Router();

const requireAdmin = [requireAuth, requireRole(ROLES.SUPER_ADMIN)];

// Public — browsing products (new + refurbished) needs no login.
productRouter.get('/', validate(listProductsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await productService.listProducts(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

productRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await productService.getProduct(req.params.id));
  } catch (err) {
    next(err);
  }
});

productRouter.post('/', requireAdmin, validate(createProductSchema), async (req, res, next) => {
  try {
    created(res, await productService.createProduct(req.body));
  } catch (err) {
    next(err);
  }
});

productRouter.put(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateProductSchema),
  async (req, res, next) => {
    try {
      ok(res, await productService.updateProduct(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

productRouter.delete('/:id', requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await productService.deactivateProduct(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
