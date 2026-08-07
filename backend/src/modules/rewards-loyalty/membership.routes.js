import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { Membership } from './membership.model.js';
import * as membershipService from './membership.service.js';

export const membershipRouter = Router();

const idParamSchema = z.object({ id: z.string().length(24) });
const purchaseSchema = z.object({
  planId: z.string().length(24),
  paymentMethod: z.enum(['Card', 'UPI', 'NetBanking', 'Wallet']).optional(),
});
const verifySchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
const planSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  benefits: z.array(z.string()).optional(),
  tierRank: z.coerce.number().int().min(1),
});

// Public — the plans page is browsable before signing in.
membershipRouter.get('/plans', async (req, res, next) => {
  try {
    ok(res, await membershipService.listPlans());
  } catch (err) {
    next(err);
  }
});

membershipRouter.use(requireAuth);

membershipRouter.get('/me', async (req, res, next) => {
  try {
    ok(res, await membershipService.getActiveMembership(req.user.id));
  } catch (err) {
    next(err);
  }
});

membershipRouter.post('/purchase', validate(purchaseSchema), async (req, res, next) => {
  try {
    created(res, await membershipService.purchaseMembership(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

membershipRouter.post(
  '/:id/verify-payment',
  validate(idParamSchema, 'params'),
  validate(verifySchema),
  async (req, res, next) => {
    try {
      ok(res, await membershipService.verifyMembershipPayment(req.user.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

// ── Super-admin plan catalogue ────────────────────────────────────────────────

const requireAdmin = requireRole(ROLES.SUPER_ADMIN);

membershipRouter.post('/plans', requireAdmin, validate(planSchema), async (req, res, next) => {
  try {
    created(res, await Membership.create(req.body));
  } catch (err) {
    next(err);
  }
});

membershipRouter.put(
  '/plans/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(planSchema.partial()),
  async (req, res, next) => {
    try {
      const plan = await Membership.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!plan) throw new ApiError(404, 'Membership plan not found');
      ok(res, plan);
    } catch (err) {
      next(err);
    }
  },
);
