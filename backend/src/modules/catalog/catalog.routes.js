import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole, optionalAuth } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as catalogService from './catalog.service.js';
import { getCategoryTree, getOfferingDetail } from './offeringBrowse.service.js';
import { buildQuote } from './quote.service.js';
import { searchCatalogue, resolveLabels, listServiceGroups, popularSearches } from './offeringSearch.service.js';
import { toCustomerQuote } from './commercialView.js';
import { listPublicBrands } from './catalogueBrand.service.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryKeyParamSchema,
  locationQuerySchema,
  offeringCodeParamSchema,
  quoteSchema,
  searchQuerySchema,
  resolveLabelsSchema,
  brandsQuerySchema,
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

// The brands a customer can pick (docs/master-catalogue Phase 19): catalogue
// brands, managed in Super Admin → Categories & Brands. ?category=AC narrows
// the list to the brands offered for that appliance. Partner brands
// (brand-admin tenants) are a different thing and are never listed here.
catalogRouter.get('/brands', validate(brandsQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await listPublicBrands(req.query));
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

// Search (docs/master-catalogue Phase 6) — public, customer-safe, rate-limited
// with the quote limiter (the app searches as the customer types).
catalogRouter.get('/search', quoteRateLimit, validate(searchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q, city, pincode, limit } = req.query;
    ok(res, await searchCatalogue(q, { city, pincode, limit }));
  } catch (err) {
    next(err);
  }
});

// Suggestions for an empty search box (most-booked services, then biggest categories).
catalogRouter.get('/search/popular', quoteRateLimit, async (req, res, next) => {
  try {
    ok(res, await popularSearches());
  } catch (err) {
    next(err);
  }
});

// Every bookable service with its "from" price (the "all services" pages).
catalogRouter.get('/service-groups', quoteRateLimit, validate(locationQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await listServiceGroups({ city: req.query.city, pincode: req.query.pincode }));
  } catch (err) {
    next(err);
  }
});

// Best destination + "from" price for a batch of labels (home tiles and other
// entry points that carry a title rather than a catalogue id).
catalogRouter.post('/search/resolve', quoteRateLimit, validate(resolveLabelsSchema), async (req, res, next) => {
  try {
    ok(res, await resolveLabels(req.body.labels, req.body.location || {}));
  } catch (err) {
    next(err);
  }
});

catalogRouter.post('/quote', quoteRateLimit, optionalAuth, validate(quoteSchema), async (req, res, next) => {
  try {
    const quote = await buildQuote(req.body, { userId: req.user?.id || null });
    ok(res, toCustomerQuote(quote));
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

