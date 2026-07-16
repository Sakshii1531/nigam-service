import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as loyaltyConfigService from './loyaltyConfig.service.js';
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  createMembershipSchema,
  updateMembershipSchema,
  updateSpinWheelSchema,
  idParamSchema,
} from './loyaltyConfig.validation.js';

export const loyaltyConfigRouter = Router();
loyaltyConfigRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

loyaltyConfigRouter.get('/milestones', async (req, res, next) => {
  try {
    ok(res, await loyaltyConfigService.listMilestones());
  } catch (err) {
    next(err);
  }
});
loyaltyConfigRouter.post('/milestones', validate(createMilestoneSchema), async (req, res, next) => {
  try {
    created(res, await loyaltyConfigService.createMilestone(req.body));
  } catch (err) {
    next(err);
  }
});
loyaltyConfigRouter.put(
  '/milestones/:id',
  validate(idParamSchema, 'params'),
  validate(updateMilestoneSchema),
  async (req, res, next) => {
    try {
      ok(res, await loyaltyConfigService.updateMilestone(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
loyaltyConfigRouter.delete('/milestones/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await loyaltyConfigService.deleteMilestone(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

loyaltyConfigRouter.get('/memberships', async (req, res, next) => {
  try {
    ok(res, await loyaltyConfigService.listMemberships());
  } catch (err) {
    next(err);
  }
});
loyaltyConfigRouter.post('/memberships', validate(createMembershipSchema), async (req, res, next) => {
  try {
    created(res, await loyaltyConfigService.createMembership(req.body));
  } catch (err) {
    next(err);
  }
});
loyaltyConfigRouter.put(
  '/memberships/:id',
  validate(idParamSchema, 'params'),
  validate(updateMembershipSchema),
  async (req, res, next) => {
    try {
      ok(res, await loyaltyConfigService.updateMembership(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
loyaltyConfigRouter.delete('/memberships/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await loyaltyConfigService.deleteMembership(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

loyaltyConfigRouter.get('/spin-wheel', async (req, res, next) => {
  try {
    ok(res, await loyaltyConfigService.getSpinWheelConfig());
  } catch (err) {
    next(err);
  }
});
loyaltyConfigRouter.put('/spin-wheel', validate(updateSpinWheelSchema), async (req, res, next) => {
  try {
    ok(res, await loyaltyConfigService.updateSpinWheelConfig(req.body));
  } catch (err) {
    next(err);
  }
});
