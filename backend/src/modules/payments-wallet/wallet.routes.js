import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import * as walletService from './wallet.service.js';
import { listLedgerQuerySchema } from './wallet.validation.js';

export const walletRouter = Router();

import { SpinWheelConfig } from '../rewards-loyalty/spinWheelConfig.model.js';
import { WalletLedger } from './walletLedger.model.js';

walletRouter.get('/spin-wheel/config', async (req, res, next) => {
  try {
    const config = await SpinWheelConfig.findOne();
    ok(res, config || { segments: [], isActive: true });
  } catch (err) {
    next(err);
  }
});

walletRouter.use(requireAuth);

import { User } from '../auth/user.model.js';

walletRouter.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    ok(res, { 
      coins: user.walletCoins || 0,
      level: user.level || 1,
      xp: user.xp || 0,
      spins: user.spinsLeft ?? 3
    });
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

walletRouter.post('/credit', async (req, res, next) => {
  try {
    const { amount, reason, xp, claimKey } = req.body;
    const allowedReasons = ['earned', 'redeemed', 'referral', 'scratch_card', 'spin_wheel', 'refund'];
    const mappedReason = allowedReasons.includes(reason) ? reason : 'earned';

    await walletService.creditCoins(req.user.id, amount || 0, { 
      reason: mappedReason,
      xpToAdd: xp || 0,
      claimKey: claimKey || null,
    });
    const user = await User.findById(req.user.id);
    ok(res, { 
      coins: user.walletCoins || 0,
      level: user.level || 1,
      xp: user.xp || 0
    });
  } catch (err) {
    next(err);
  }
});

walletRouter.post('/spin-wheel/spin', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    if ((user.spinsLeft ?? 3) <= 0) {
      return res.status(400).json({ error: { message: 'No spins left for today' } });
    }

    const config = await SpinWheelConfig.findOne();
    if (!config || !Array.isArray(config.segments) || config.segments.length === 0) {
      return res.status(400).json({ error: { message: 'Spin wheel is not configured' } });
    }

    // Pick winning segment based on probability weights
    const totalProb = config.segments.reduce((sum, s) => sum + (s.probability || 0), 0);
    const r = Math.random() * Math.max(totalProb, 100);
    let cumulative = 0;
    let winIndex = -1;

    for (let i = 0; i < config.segments.length; i++) {
      cumulative += config.segments[i].probability || 0;
      if (r <= cumulative) {
        winIndex = i;
        break;
      }
    }

    if (winIndex === -1) {
      winIndex = config.segments.findIndex(s => s.winningType === 'none');
      if (winIndex === -1) winIndex = config.segments.length - 1;
    }

    const wonSegment = config.segments[winIndex];

    // Decrement spinsLeft
    user.spinsLeft = Math.max((user.spinsLeft ?? 3) - 1, 0);

    // Apply winnings
    let xpToAdd = 20; // 20 XP default participation reward
    let coinsToAdd = 0;

    if (wonSegment.winningType === 'spin') {
      user.spinsLeft += (wonSegment.value || 1);
    } else if (wonSegment.winningType === 'coins' || wonSegment.winningType === 'money') {
      coinsToAdd = wonSegment.value || 0;
      xpToAdd = coinsToAdd > 0 ? coinsToAdd : 20;
    }

    user.walletCoins = (user.walletCoins || 0) + coinsToAdd;
    user.xp = (user.xp || 0) + xpToAdd;

    // Recalculate level
    const calculatedLevel = Math.floor((user.xp || 0) / 1000) + 1;
    if (calculatedLevel > (user.level || 1)) {
      user.level = calculatedLevel;
    }

    await user.save();

    // Create ledger entry if coins/money won
    if (coinsToAdd > 0) {
      await WalletLedger.create({
        user: user._id,
        delta: coinsToAdd,
        reason: 'spin_wheel',
        balanceAfter: user.walletCoins
      });
    }

    ok(res, {
      winIndex,
      wonSegment: {
        label: wonSegment.label,
        winningType: wonSegment.winningType,
        value: wonSegment.value
      },
      spinsLeft: user.spinsLeft,
      coins: user.walletCoins,
      xp: user.xp,
      level: user.level
    });

  } catch (err) {
    next(err);
  }
});

// Which one-time rewards this user has already claimed — the client used to keep
// this list in localStorage, so clearing it re-enabled every claim.
walletRouter.get('/claims', async (req, res, next) => {
  try {
    ok(res, await walletService.listClaimKeys(req.user.id));
  } catch (err) {
    next(err);
  }
});
