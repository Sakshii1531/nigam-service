import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as catalogService from './catalog.service.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryKeyParamSchema,
  addProductTypeSchema,
  addServiceItemSchema,
} from './catalog.validation.js';

export const catalogRouter = Router();

const requireAdmin = [requireAuth, requireRole(ROLES.SUPER_ADMIN)];

// Public — the customer app browses the catalog without needing to be logged in.
catalogRouter.get('/categories', async (req, res, next) => {
  try {
    ok(res, await catalogService.listCategories());
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/categories/:key', validate(categoryKeyParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await catalogService.getCategoryByKey(req.params.key));
  } catch (err) {
    next(err);
  }
});

// Admin-editable (Phase 4 exit criterion) — a full CMS with brand-scoped/finer
// permissions lands in Phase 8; a super_admin role gate is enough for now.
catalogRouter.post('/categories', requireAdmin, validate(createCategorySchema), async (req, res, next) => {
  try {
    created(res, await catalogService.createCategory(req.body));
  } catch (err) {
    next(err);
  }
});

catalogRouter.put(
  '/categories/:key',
  requireAdmin,
  validate(categoryKeyParamSchema, 'params'),
  validate(updateCategorySchema),
  async (req, res, next) => {
    try {
      ok(res, await catalogService.updateCategory(req.params.key, req.body));
    } catch (err) {
      next(err);
    }
  },
);

catalogRouter.post(
  '/categories/:key/product-types',
  requireAdmin,
  validate(categoryKeyParamSchema, 'params'),
  validate(addProductTypeSchema),
  async (req, res, next) => {
    try {
      created(res, await catalogService.addProductType(req.params.key, req.body));
    } catch (err) {
      next(err);
    }
  },
);

catalogRouter.post(
  '/categories/:key/services',
  requireAdmin,
  validate(categoryKeyParamSchema, 'params'),
  validate(addServiceItemSchema),
  async (req, res, next) => {
    try {
      created(res, await catalogService.addServiceItem(req.params.key, req.body));
    } catch (err) {
      next(err);
    }
  },
);
