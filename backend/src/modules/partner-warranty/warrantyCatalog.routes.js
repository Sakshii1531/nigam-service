import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as catalog from './warrantyCatalog.service.js';
import {
  idParamSchema,
  brandIdParamSchema,
  categoryIdParamSchema,
  listBrandsQuerySchema,
  groupQuerySchema,
  issuesQuerySchema,
  createGroupSchema,
  updateGroupSchema,
  adminIssuesQuerySchema,
  createIssueSchema,
  updateIssueSchema,
  adminBrandSettingsSchema,
  brandCoverageSchema,
  partnerEligibilitySchema,
} from './warrantyCatalog.validation.js';

/** Route handler → promise; errors go to the central handler. */
const handle = (fn, respond = ok) => async (req, res, next) => {
  try {
    respond(res, await fn(req));
  } catch (err) {
    next(err);
  }
};
const byId = validate(idParamSchema, 'params');

// ── Public: what the customer app's Partner Warranty screens list ────────────
// /api/v1/partner-warranty — no login needed to browse, same as the service catalogue.
export const warrantyCatalogPublicRouter = Router();

warrantyCatalogPublicRouter.get('/groups', handle(() => catalog.listGroups()));
warrantyCatalogPublicRouter.get('/brands', validate(listBrandsQuerySchema, 'query'), handle((req) => catalog.listBrands(req.query)));
warrantyCatalogPublicRouter.get(
  '/brands/:brandId/products',
  validate(brandIdParamSchema, 'params'),
  validate(groupQuerySchema, 'query'),
  handle((req) => catalog.listBrandProducts(req.params.brandId, req.query)),
);
warrantyCatalogPublicRouter.get(
  '/products/:categoryId/issues',
  validate(categoryIdParamSchema, 'params'),
  validate(issuesQuerySchema, 'query'),
  handle((req) => catalog.listIssues(req.params.categoryId, req.query)),
);

// ── Super Admin: /api/v1/super-admin/warranty-catalog ────────────────────────
export const warrantyCatalogAdminRouter = Router();
warrantyCatalogAdminRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));
const actor = (req) => req.user.id;

warrantyCatalogAdminRouter.get('/groups', handle(() => catalog.adminListGroups()));
warrantyCatalogAdminRouter.post('/groups', validate(createGroupSchema), handle((req) => catalog.createGroup(req.body, actor(req)), created));
warrantyCatalogAdminRouter.put('/groups/:id', byId, validate(updateGroupSchema), handle((req) => catalog.updateGroup(req.params.id, req.body, actor(req))));

warrantyCatalogAdminRouter.get('/issues', validate(adminIssuesQuerySchema, 'query'), handle((req) => catalog.adminListIssues(req.query)));
warrantyCatalogAdminRouter.post('/issues', validate(createIssueSchema), handle((req) => catalog.createIssue(req.body, actor(req)), created));
warrantyCatalogAdminRouter.put('/issues/:id', byId, validate(updateIssueSchema), handle((req) => catalog.updateIssue(req.params.id, req.body, actor(req))));
warrantyCatalogAdminRouter.delete('/issues/:id', byId, handle((req) => catalog.deleteIssue(req.params.id, actor(req))));

warrantyCatalogAdminRouter.get('/coverage-options', handle(() => catalog.listCoverageOptions()));
warrantyCatalogAdminRouter.get('/brands', handle(() => catalog.adminListBrands()));
warrantyCatalogAdminRouter.get('/brands/:id', byId, handle((req) => catalog.getBrandSettings(req.params.id)));
warrantyCatalogAdminRouter.put(
  '/brands/:id',
  byId,
  validate(adminBrandSettingsSchema),
  handle((req) => catalog.updateBrandSettings(req.params.id, req.body, actor(req))),
);

// Which brands a service partner may do warranty jobs for, and where.
warrantyCatalogAdminRouter.get('/service-providers/:id', byId, handle((req) => catalog.getPartnerEligibility(req.params.id)));
warrantyCatalogAdminRouter.put(
  '/service-providers/:id',
  byId,
  validate(partnerEligibilitySchema),
  handle((req) => catalog.updatePartnerEligibility(req.params.id, req.body, actor(req))),
);

// ── Brand admin: /api/v1/brand/warranty-coverage ─────────────────────────────
export const warrantyCoverageBrandRouter = Router();
warrantyCoverageBrandRouter.use(requireAuth, requireBrandScope);

warrantyCoverageBrandRouter.get(
  '/',
  handle(async (req) => ({
    ...(await catalog.getBrandSettings(req.user.brand)),
    options: await catalog.listCoverageOptions(),
  })),
);
warrantyCoverageBrandRouter.put(
  '/',
  validate(brandCoverageSchema),
  handle(async (req) => ({
    ...(await catalog.updateBrandSettings(req.user.brand, req.body, req.user.id, { asBrand: true })),
    // Keep PUT and GET response shapes identical. The brand panel renders this
    // response immediately after save and still needs the catalogue options.
    options: await catalog.listCoverageOptions(),
  })),
);
