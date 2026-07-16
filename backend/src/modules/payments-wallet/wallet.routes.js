import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import * as walletService from './wallet.service.js';
import { listLedgerQuerySchema } from './wallet.validation.js';

export const walletRouter = Router();
walletRouter.use(requireAuth);

walletRouter.get('/', async (req, res, next) => {
  try {
    ok(res, { coins: await walletService.getBalance(req.user.id) });
  } catch (err) {
    next(err);
  }
});

walletRouter.get('/ledger', validate(listLedgerQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await walletService.getLedger(req.user.id, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});
