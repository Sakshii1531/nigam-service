import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import * as walletService from './wallet.service.js';
import * as rewardsService from '../rewards-loyalty/rewards.service.js';
import { getRewardsProgram } from '../rewards-loyalty/rewardsProgram.model.js';
import { listLedgerQuerySchema } from './wallet.validation.js';

export const walletRouter = Router();

// The wheel's segments (labels and prizes, never the odds), for drawing it
// before sign-in. Empty when the programme or the wheel is switched off.
walletRouter.get('/spin-wheel/config', async (req, res, next) => {
  try {
    ok(res, rewardsService.publicWheel(await getRewardsProgram()));
  } catch (err) {
    next(err);
  }
});

walletRouter.use(requireAuth);

// Coins, XP, level and today's spins — the booking and payment screens read
// `coins` from here; the Play Zone reads the rest.
walletRouter.get('/', async (req, res, next) => {
  try {
    const r = await rewardsService.getCustomerRewards(req.user.id);
    ok(res, { coins: r.coins, xp: r.xp, level: r.level.number, levelInfo: r.level, spins: r.spinsLeft });
  } catch (err) {
    next(err);
  }
});

// Everything the Rewards Play Zone shows: level and levels, tasks, wheel.
walletRouter.get('/rewards', async (req, res, next) => {
  try {
    ok(res, await rewardsService.getCustomerRewards(req.user.id));
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

walletRouter.post('/spin-wheel/spin', async (req, res, next) => {
  try {
    ok(res, await rewardsService.spin(req.user.id));
  } catch (err) {
    next(err);
  }
});

// A one-time task's reward. The server checks the task is really done and
// pays the amount the Rewards Program sets. (There used to be a POST /credit
// here that credited whatever amount the app sent.)
walletRouter.post(
  '/tasks/:key/claim',
  validate(z.object({ key: z.enum(['book_service', 'write_review', 'refer_friend']) }), 'params'),
  async (req, res, next) => {
    try {
      ok(res, await rewardsService.claimTask(req.user.id, req.params.key));
    } catch (err) {
      next(err);
    }
  },
);

// Which one-time rewards this user has already claimed.
walletRouter.get('/claims', async (req, res, next) => {
  try {
    ok(res, await walletService.listClaimKeys(req.user.id));
  } catch (err) {
    next(err);
  }
});
