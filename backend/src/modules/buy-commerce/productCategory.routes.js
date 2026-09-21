import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as svc from './productCategory.service.js';
import {
  createProductCategorySchema,
  updateProductCategorySchema,
  idParamSchema,
} from './productCategory.validation.js';

export const productCategoryRouter = Router();

const requireAdmin = [requireAuth, requireRole(ROLES.SUPER_ADMIN)];

/**
 * Public — the customer app & the super-admin Add Product modal both call this
 * to render the category list without needing to be authenticated.
 */
productCategoryRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await svc.listProductCategories());
  } catch (err) {
    next(err);
  }
});

/** Admin — includes inactive categories for the management table. */
productCategoryRouter.get('/all', requireAdmin, async (req, res, next) => {
  try {
    ok(res, await svc.listAllProductCategories());
  } catch (err) {
    next(err);
  }
});

productCategoryRouter.get(
  '/:id',
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await svc.getProductCategory(req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

productCategoryRouter.post(
  '/',
  requireAdmin,
  validate(createProductCategorySchema),
  async (req, res, next) => {
    try {
      created(res, await svc.createProductCategory(req.body));
    } catch (err) {
      next(err);
    }
  },
);

productCategoryRouter.put(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateProductCategorySchema),
  async (req, res, next) => {
    try {
      ok(res, await svc.updateProductCategory(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

productCategoryRouter.delete(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await svc.deleteProductCategory(req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

