import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as configService from './categoryBookingConfig.service.js';
import { upsertCategoryConfigSchema, categoryNameParamSchema } from './categoryBookingConfig.validation.js';

export const categoryBookingConfigRouter = Router();
const requireAdmin = [requireAuth, requireRole(ROLES.SUPER_ADMIN)];

// Public — the booking flow reads these, no auth.
categoryBookingConfigRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await configService.listCategoryConfigs());
  } catch (err) {
    next(err);
  }
});

categoryBookingConfigRouter.get('/:categoryName', validate(categoryNameParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await configService.getCategoryConfig(req.params.categoryName));
  } catch (err) {
    next(err);
  }
});

categoryBookingConfigRouter.put(
  '/:categoryName',
  ...requireAdmin,
  validate(categoryNameParamSchema, 'params'),
  validate(upsertCategoryConfigSchema),
  async (req, res, next) => {
    try {
      ok(res, await configService.upsertCategoryConfig(req.params.categoryName, req.body));
    } catch (err) {
      next(err);
    }
  },
);

categoryBookingConfigRouter.delete(
  '/:categoryName',
  ...requireAdmin,
  validate(categoryNameParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await configService.deleteCategoryConfig(req.params.categoryName));
    } catch (err) {
      next(err);
    }
  },
);
