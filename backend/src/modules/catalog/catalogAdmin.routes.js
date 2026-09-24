import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as admin from './catalogAdmin.service.js';
import {
  idParamSchema,
  statusSchema,
  createCategorySchema,
  updateCategorySchema,
  createProductTypeSchema,
  updateProductTypeSchema,
  createServiceSchema,
  updateServiceSchema,
  createVariantSchema,
  updateVariantSchema,
  createOfferingSchema,
  updateOfferingSchema,
  changeRateSchema,
  duplicateOfferingSchema,
  listOfferingsQuerySchema,
  rateChangesQuerySchema,
  suggestCodeQuerySchema,
} from './catalogAdmin.validation.js';

// Super-admin Master Service & Offering Catalogue — /api/v1/super-admin/catalogue.
// Gated on the super-admin role like the other super-admin modules.
export const catalogAdminRouter = Router();
catalogAdminRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

/** Route handler → promise; errors go to the central handler. */
const handle = (fn, respond = ok) => async (req, res, next) => {
  try {
    const result = await fn(req);
    if (result && result.items && result.meta) respond(res, result.items, result.meta);
    else respond(res, result);
  } catch (err) {
    next(err);
  }
};
const byId = validate(idParamSchema, 'params');
const actor = (req) => req.user.id;

// Categories & the structure under one
catalogAdminRouter.get('/categories', handle(() => admin.listCategories()));
catalogAdminRouter.post('/categories', validate(createCategorySchema), handle((req) => admin.createCategory(req.body, actor(req)), created));
catalogAdminRouter.put('/categories/:id', byId, validate(updateCategorySchema), handle((req) => admin.updateCategory(req.params.id, req.body, actor(req))));
catalogAdminRouter.patch('/categories/:id/status', byId, validate(statusSchema), handle((req) => admin.updateCategory(req.params.id, req.body, actor(req))));
catalogAdminRouter.get('/categories/:id/structure', byId, handle((req) => admin.getCategoryStructure(req.params.id)));

// Product types
catalogAdminRouter.post('/product-types', validate(createProductTypeSchema), handle((req) => admin.createProductType(req.body, actor(req)), created));
catalogAdminRouter.put('/product-types/:id', byId, validate(updateProductTypeSchema), handle((req) => admin.updateProductType(req.params.id, req.body, actor(req))));
catalogAdminRouter.patch('/product-types/:id/status', byId, validate(statusSchema), handle((req) => admin.updateProductType(req.params.id, req.body, actor(req))));

// Services
catalogAdminRouter.post('/services', validate(createServiceSchema), handle((req) => admin.createService(req.body, actor(req)), created));
catalogAdminRouter.put('/services/:id', byId, validate(updateServiceSchema), handle((req) => admin.updateService(req.params.id, req.body, actor(req))));
catalogAdminRouter.patch('/services/:id/status', byId, validate(statusSchema), handle((req) => admin.updateService(req.params.id, req.body, actor(req))));

// Variants (product sizes) and options (standalone service choices)
catalogAdminRouter.post('/variants', validate(createVariantSchema), handle((req) => admin.createVariant(req.body, actor(req)), created));
catalogAdminRouter.put('/variants/:id', byId, validate(updateVariantSchema), handle((req) => admin.updateVariant(req.params.id, req.body, actor(req))));
catalogAdminRouter.patch('/variants/:id/status', byId, validate(statusSchema), handle((req) => admin.updateVariant(req.params.id, req.body, actor(req))));

// Offerings
catalogAdminRouter.get('/offerings', validate(listOfferingsQuerySchema, 'query'), handle((req) => admin.listOfferings(req.query)));
catalogAdminRouter.get('/suggest-code', validate(suggestCodeQuerySchema, 'query'), handle((req) => admin.suggestCode(req.query)));
catalogAdminRouter.post('/offerings', validate(createOfferingSchema), handle((req) => admin.createOffering(req.body, actor(req)), created));
catalogAdminRouter.get('/offerings/:id', byId, handle((req) => admin.getOffering(req.params.id)));
catalogAdminRouter.put('/offerings/:id', byId, validate(updateOfferingSchema), handle((req) => admin.updateOffering(req.params.id, req.body, actor(req))));
catalogAdminRouter.patch('/offerings/:id/status', byId, validate(statusSchema), handle((req) => admin.setOfferingStatus(req.params.id, req.body.isActive, actor(req))));
catalogAdminRouter.post('/offerings/:id/duplicate', byId, validate(duplicateOfferingSchema), handle((req) => admin.duplicateOffering(req.params.id, req.body, actor(req)), created));

// Rates — the only way a price or payout changes
catalogAdminRouter.post('/offerings/:id/rates', byId, validate(changeRateSchema), handle((req) => admin.changeRate(req.params.id, req.body, actor(req)), created));
catalogAdminRouter.get('/offerings/:id/rates', byId, handle((req) => admin.listRateHistory(req.params.id)));
catalogAdminRouter.get('/rate-changes', validate(rateChangesQuerySchema, 'query'), handle((req) => admin.listRateChanges(req.query)));
