import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as brandCatalogService from './brandCatalog.service.js';
import {
  createMasterServiceSchema,
  updateMasterServiceSchema,
  createSubBrandSchema,
  updateSubBrandSchema,
  createBrandProductSchema,
  updateBrandProductSchema,
  idParamSchema,
  subBrandIdParamSchema,
} from './brandCatalog.validation.js';

export const brandCatalogRouter = Router();
brandCatalogRouter.use(requireAuth, requireBrandScope);

brandCatalogRouter.get('/master-services', async (req, res, next) => {
  try {
    ok(res, await brandCatalogService.listMasterServices(req.user.brand));
  } catch (err) {
    next(err);
  }
});

brandCatalogRouter.post('/master-services', validate(createMasterServiceSchema), async (req, res, next) => {
  try {
    created(res, await brandCatalogService.createMasterService(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

brandCatalogRouter.put(
  '/master-services/:id',
  validate(idParamSchema, 'params'),
  validate(updateMasterServiceSchema),
  async (req, res, next) => {
    try {
      ok(res, await brandCatalogService.updateMasterService(req.user.brand, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

brandCatalogRouter.delete('/master-services/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await brandCatalogService.deleteMasterService(req.user.brand, req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

brandCatalogRouter.get('/sub-brands', async (req, res, next) => {
  try {
    ok(res, await brandCatalogService.listSubBrands(req.user.brand));
  } catch (err) {
    next(err);
  }
});

brandCatalogRouter.post('/sub-brands', validate(createSubBrandSchema), async (req, res, next) => {
  try {
    created(res, await brandCatalogService.createSubBrand(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

brandCatalogRouter.put(
  '/sub-brands/:id',
  validate(idParamSchema, 'params'),
  validate(updateSubBrandSchema),
  async (req, res, next) => {
    try {
      ok(res, await brandCatalogService.updateSubBrand(req.user.brand, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

brandCatalogRouter.delete('/sub-brands/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await brandCatalogService.deleteSubBrand(req.user.brand, req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

brandCatalogRouter.get(
  '/sub-brands/:subBrandId/products',
  validate(subBrandIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await brandCatalogService.listBrandProducts(req.user.brand, req.params.subBrandId));
    } catch (err) {
      next(err);
    }
  },
);

brandCatalogRouter.post(
  '/sub-brands/:subBrandId/products',
  validate(subBrandIdParamSchema, 'params'),
  validate(createBrandProductSchema),
  async (req, res, next) => {
    try {
      created(res, await brandCatalogService.createBrandProduct(req.user.brand, req.params.subBrandId, req.body));
    } catch (err) {
      next(err);
    }
  },
);

brandCatalogRouter.put(
  '/products/:id',
  validate(idParamSchema, 'params'),
  validate(updateBrandProductSchema),
  async (req, res, next) => {
    try {
      ok(res, await brandCatalogService.updateBrandProduct(req.user.brand, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

brandCatalogRouter.delete('/products/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await brandCatalogService.deleteBrandProduct(req.user.brand, req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
