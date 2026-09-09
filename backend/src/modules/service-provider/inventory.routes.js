import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachServiceProvider } from '../../middleware/serviceProvider.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as inventoryService from './inventory.service.js';
import { placePartOrderSchema, listPartOrdersQuerySchema, partOrderIdParamSchema } from './inventory.validation.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth, requireRole(ROLES.SERVICE_PROVIDER), attachServiceProvider);

inventoryRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await inventoryService.listInventory(req.serviceProvider.id));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post('/part-orders', validate(placePartOrderSchema), async (req, res, next) => {
  try {
    created(res, await inventoryService.placePartOrder(req.serviceProvider.id, req.body));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get('/part-orders', validate(listPartOrdersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await inventoryService.listPartOrders(req.serviceProvider.id, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get('/part-orders/:id', validate(partOrderIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await inventoryService.getPartOrder(req.serviceProvider.id, req.params.id));
  } catch (err) {
    next(err);
  }
});
