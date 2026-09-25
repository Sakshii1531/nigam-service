import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as sparePartCatalogService from './sparePartCatalog.service.js';
import { createSparePartSchema, updateSparePartSchema, stockChangeSchema, listQuerySchema, idParamSchema } from './sparePartCatalog.validation.js';

export const sparePartCatalogRouter = Router();
sparePartCatalogRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

sparePartCatalogRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await sparePartCatalogService.listSpareParts(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

sparePartCatalogRouter.post('/', validate(createSparePartSchema), async (req, res, next) => {
  try {
    created(res, await sparePartCatalogService.createSparePart(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
});

sparePartCatalogRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await sparePartCatalogService.getSparePart(req.params.id));
  } catch (err) {
    next(err);
  }
});

// Restock / issue / adjust with a reason (Phase 21 stock history).
sparePartCatalogRouter.post('/:id/stock', validate(idParamSchema, 'params'), validate(stockChangeSchema), async (req, res, next) => {
  try {
    ok(res, await sparePartCatalogService.changeStock(req.params.id, req.body, req.user.id));
  } catch (err) {
    next(err);
  }
});

sparePartCatalogRouter.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateSparePartSchema),
  async (req, res, next) => {
    try {
      ok(res, await sparePartCatalogService.updateSparePart(req.params.id, req.body, req.user.id));
    } catch (err) {
      next(err);
    }
  },
);

sparePartCatalogRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await sparePartCatalogService.deleteSparePart(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
