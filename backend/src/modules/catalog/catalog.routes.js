import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole, optionalAuth } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as catalogService from './catalog.service.js';
import { getCategoryTree, getOfferingDetail } from './offeringBrowse.service.js';
import { buildQuote } from './quote.service.js';
import { toCustomerQuote } from './commercialView.js';
import { Brand } from '../super-admin/brand.model.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryKeyParamSchema,
  addProductTypeSchema,
  updateProductTypeSchema,
  productTypeIdParamSchema,
  addServiceItemSchema,
  updateServiceItemSchema,
  serviceItemIdParamSchema,
  locationQuerySchema,
  offeringCodeParamSchema,
  quoteSchema,
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

// The brands a customer can pick when registering an appliance. The full Brand
// record is super-admin-only; this exposes just the labels the picker needs, so
// customer screens stop shipping their own hardcoded brand list.
catalogRouter.get('/brands', async (req, res, next) => {
  try {
    let brands = await Brand.find({ status: 'Active' }).select('name category').sort({ name: 1 });
    if (!brands || brands.length === 0) {
      const count = await Brand.countDocuments();
      if (count === 0) {
        const DEFAULT_BRANDS = [
          { name: 'Samsung', category: 'Appliances', status: 'Active' },
          { name: 'LG', category: 'Appliances', status: 'Active' },
          { name: 'Sony', category: 'Electronics', status: 'Active' },
          { name: 'Panasonic', category: 'Appliances', status: 'Active' },
          { name: 'Whirlpool', category: 'Appliances', status: 'Active' },
          { name: 'Daikin', category: 'Air Conditioner', status: 'Active' },
          { name: 'Voltas', category: 'Air Conditioner', status: 'Active' },
          { name: 'Godrej', category: 'Appliances', status: 'Active' },
          { name: 'Carrier', category: 'Air Conditioner', status: 'Active' },
          { name: 'Hitachi', category: 'Air Conditioner', status: 'Active' },
          { name: 'Blue Star', category: 'Air Conditioner', status: 'Active' },
          { name: 'Haier', category: 'Appliances', status: 'Active' },
          { name: 'IFB', category: 'Appliances', status: 'Active' },
          { name: 'Bosch', category: 'Appliances', status: 'Active' },
          { name: 'Kent', category: 'Water Purifier', status: 'Active' },
          { name: 'Aquaguard', category: 'Water Purifier', status: 'Active' },
        ];
        await Brand.insertMany(DEFAULT_BRANDS);
        brands = await Brand.find({ status: 'Active' }).select('name category').sort({ name: 1 });
      }
    }
    ok(res, brands);
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

// ─── Master Service & Offering Catalogue (docs/master-catalogue Phase 2) ───
// Public reads: the customer app browses and prices without being logged in.
// Only bookable offerings appear, only customer-safe fields leave (commercialView).

catalogRouter.get(
  '/categories/:key/tree',
  validate(categoryKeyParamSchema, 'params'),
  validate(locationQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      ok(res, await getCategoryTree(req.params.key, req.query));
    } catch (err) {
      next(err);
    }
  },
);

catalogRouter.get(
  '/offerings/:code',
  validate(offeringCodeParamSchema, 'params'),
  validate(locationQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      ok(res, await getOfferingDetail(req.params.code, req.query));
    } catch (err) {
      next(err);
    }
  },
);

// The app re-quotes on every selection change (quantity, express, coupon…),
// so this gets its own ceiling below the app-wide one. Skipped under test for
// the same reason the global limiter is (app.js).
const quoteRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { data: null, error: { message: 'Too many price requests, please slow down.' }, meta: {} },
});

catalogRouter.post('/quote', quoteRateLimit, optionalAuth, validate(quoteSchema), async (req, res, next) => {
  try {
    const quote = await buildQuote(req.body, { userId: req.user?.id || null });
    ok(res, toCustomerQuote(quote));
  } catch (err) {
    next(err);
  }
});

// Admin view — every product type/service (including inactive), each with its
// real id, for the catalog console's edit/delete actions.
catalogRouter.get(
  '/categories/:key/admin',
  requireAdmin,
  validate(categoryKeyParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await catalogService.getCategoryForAdmin(req.params.key));
    } catch (err) {
      next(err);
    }
  },
);

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

catalogRouter.put(
  '/categories/:key/product-types/:productTypeId',
  requireAdmin,
  validate(productTypeIdParamSchema, 'params'),
  validate(updateProductTypeSchema),
  async (req, res, next) => {
    try {
      ok(res, await catalogService.updateProductType(req.params.key, req.params.productTypeId, req.body));
    } catch (err) {
      next(err);
    }
  },
);

catalogRouter.delete(
  '/categories/:key/product-types/:productTypeId',
  requireAdmin,
  validate(productTypeIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await catalogService.deleteProductType(req.params.key, req.params.productTypeId);
      ok(res, { deleted: true });
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

catalogRouter.put(
  '/categories/:key/services/:serviceItemId',
  requireAdmin,
  validate(serviceItemIdParamSchema, 'params'),
  validate(updateServiceItemSchema),
  async (req, res, next) => {
    try {
      ok(res, await catalogService.updateServiceItem(req.params.key, req.params.serviceItemId, req.body));
    } catch (err) {
      next(err);
    }
  },
);

catalogRouter.delete(
  '/categories/:key/services/:serviceItemId',
  requireAdmin,
  validate(serviceItemIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await catalogService.deleteServiceItem(req.params.key, req.params.serviceItemId);
      ok(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
);
