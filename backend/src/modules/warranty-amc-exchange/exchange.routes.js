import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { Brand } from '../super-admin/brand.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as exchangeService from './exchange.service.js';
import {
  valuateSchema,
  createExchangeRequestSchema,
  createQuestionSetSchema,
  idParamSchema,
  categoryParamSchema,
  brandListQuerySchema,
  upsertCampaignSchema,
  upsertProductConfigSchema,
} from './exchange.validation.js';

export const exchangeRouter = Router();
exchangeRouter.use(requireAuth);

exchangeRouter.get('/question-sets/:category', validate(categoryParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await exchangeService.getQuestionSet(req.params.category));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.post(
  '/question-sets',
  requireRole(ROLES.SUPER_ADMIN),
  validate(createQuestionSetSchema),
  async (req, res, next) => {
    try {
      created(res, await exchangeService.createQuestionSet(req.body));
    } catch (err) {
      next(err);
    }
  },
);

exchangeRouter.post('/valuate', validate(valuateSchema), async (req, res, next) => {
  try {
    ok(res, await exchangeService.valuate(req.body));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.post('/requests', validate(createExchangeRequestSchema), async (req, res, next) => {
  try {
    created(res, await exchangeService.createExchangeRequest(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

// Declared before '/requests/:id' so "brand" is never matched as an id.
// Separate from '/requests' because that one is deliberately customer-scoped
// (req.user.id) — a brand admin calling it would get their own empty list.
exchangeRouter.get(
  '/requests/brand',
  requireBrandScope,
  validate(brandListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const brand = await Brand.findById(req.user.brand).select('name').lean();
      if (!brand) throw new ApiError(404, 'Brand not found');
      const { items, meta } = await exchangeService.listExchangeRequestsForBrand(brand.name, req.query);
      ok(res, items, meta);
    } catch (err) {
      next(err);
    }
  },
);

exchangeRouter.get('/requests', async (req, res, next) => {
  try {
    ok(res, await exchangeService.listExchangeRequestsCustomer(req.user.id, req.query));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.get('/requests/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await exchangeService.getExchangeRequest(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

// ── Exchange merchandising config ─────────────────────────────────────────────

const requireAdmin = requireRole(ROLES.SUPER_ADMIN);

exchangeRouter.get('/question-sets', async (req, res, next) => {
  try {
    ok(res, await exchangeService.listQuestionSets());
  } catch (err) {
    next(err);
  }
});

exchangeRouter.put(
  '/question-sets/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(createQuestionSetSchema),
  async (req, res, next) => {
    try {
      ok(res, await exchangeService.updateQuestionSet(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

exchangeRouter.delete('/question-sets/:id', requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await exchangeService.deleteQuestionSet(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

exchangeRouter.get('/campaigns', async (req, res, next) => {
  try {
    ok(res, await exchangeService.listCampaigns());
  } catch (err) {
    next(err);
  }
});

exchangeRouter.post('/campaigns', requireAdmin, validate(upsertCampaignSchema), async (req, res, next) => {
  try {
    created(res, await exchangeService.createCampaign(req.body));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.put(
  '/campaigns/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(upsertCampaignSchema.partial()),
  async (req, res, next) => {
    try {
      ok(res, await exchangeService.updateCampaign(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

exchangeRouter.delete('/campaigns/:id', requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await exchangeService.deleteCampaign(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

exchangeRouter.get('/product-configs', async (req, res, next) => {
  try {
    ok(res, await exchangeService.listProductConfigs());
  } catch (err) {
    next(err);
  }
});

exchangeRouter.put('/product-configs', requireAdmin, validate(upsertProductConfigSchema), async (req, res, next) => {
  try {
    ok(res, await exchangeService.upsertProductConfig(req.body));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.delete('/product-configs/:id', requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await exchangeService.deleteProductConfig(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

// ── Trade-in base values ──────────────────────────────────────────────────────
// Readable by any signed-in customer (the ExchangeModal quotes from it),
// writable by super-admin only.

const baseValueQuerySchema = z.object({ category: z.string().optional(), brand: z.string().optional() });
const baseValueLookupSchema = z.object({
  category: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
});
const upsertBaseValueSchema = baseValueLookupSchema.extend({
  baseValue: z.coerce.number().min(0),
  isActive: z.boolean().optional(),
});

exchangeRouter.get('/base-values', validate(baseValueQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await exchangeService.listBaseValues(req.query));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.get('/base-values/lookup', validate(baseValueLookupSchema, 'query'), async (req, res, next) => {
  try {
    const found = await exchangeService.getBaseValue(req.query);
    ok(res, { found: Boolean(found), baseValue: found ? found.baseValue : null });
  } catch (err) {
    next(err);
  }
});

exchangeRouter.post('/base-values', requireAdmin, validate(upsertBaseValueSchema), async (req, res, next) => {
  try {
    ok(res, await exchangeService.upsertBaseValue(req.body));
  } catch (err) {
    next(err);
  }
});

exchangeRouter.delete('/base-values/:id', requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await exchangeService.deleteBaseValue(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
