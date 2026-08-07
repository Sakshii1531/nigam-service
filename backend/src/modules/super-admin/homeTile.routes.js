import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as tileService from './homeTile.service.js';
import {
  listTilesQuerySchema,
  createTileSchema,
  updateTileSchema,
  idParamSchema,
} from './homeTile.validation.js';

export const homeTileRouter = Router();
const requireAdmin = [requireAuth, requireRole(ROLES.SUPER_ADMIN)];

// Public — the customer app reads these on the home screen, no auth.
homeTileRouter.get('/', validate(listTilesQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await tileService.listPublicTiles(req.query));
  } catch (err) {
    next(err);
  }
});

// Console reader — includes deactivated tiles the app never sees.
homeTileRouter.get('/admin', ...requireAdmin, validate(listTilesQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await tileService.listAllTiles(req.query));
  } catch (err) {
    next(err);
  }
});

homeTileRouter.post('/', ...requireAdmin, validate(createTileSchema), async (req, res, next) => {
  try {
    created(res, await tileService.createTile(req.body));
  } catch (err) {
    next(err);
  }
});

homeTileRouter.put(
  '/:id',
  ...requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateTileSchema),
  async (req, res, next) => {
    try {
      ok(res, await tileService.updateTile(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

homeTileRouter.delete('/:id', ...requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await tileService.deleteTile(req.params.id));
  } catch (err) {
    next(err);
  }
});
