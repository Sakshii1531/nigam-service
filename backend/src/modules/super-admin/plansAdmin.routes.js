import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as plans from './plansAdmin.service.js';
import { idParamSchema, createAmcPlanSchema, updateAmcPlanSchema, createEwPlanSchema, updateEwPlanSchema } from './plansAdmin.validation.js';

// Super Admin → Plans — /api/v1/super-admin/plans (docs/master-catalogue Phase 12).
export const plansAdminRouter = Router();
plansAdminRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

const handle = (fn, send = ok) => async (req, res, next) => {
  try {
    send(res, await fn(req));
  } catch (err) {
    next(err);
  }
};
const byId = validate(idParamSchema, 'params');
const actor = (req) => req.user.id;

plansAdminRouter.get('/amc', handle(() => plans.listAmcPlans()));
plansAdminRouter.post('/amc', validate(createAmcPlanSchema), handle((req) => plans.createAmcPlan(req.body, actor(req)), created));
plansAdminRouter.put('/amc/:id', byId, validate(updateAmcPlanSchema), handle((req) => plans.updateAmcPlan(req.params.id, req.body, actor(req))));
plansAdminRouter.delete(
  '/amc/:id',
  byId,
  handle(async (req) => {
    await plans.deleteAmcPlan(req.params.id, actor(req));
    return { deleted: true };
  }),
);

plansAdminRouter.get('/extended-warranty', handle(() => plans.listEwPlans()));
plansAdminRouter.post('/extended-warranty', validate(createEwPlanSchema), handle((req) => plans.createEwPlan(req.body, actor(req)), created));
plansAdminRouter.put('/extended-warranty/:id', byId, validate(updateEwPlanSchema), handle((req) => plans.updateEwPlan(req.params.id, req.body, actor(req))));
plansAdminRouter.delete(
  '/extended-warranty/:id',
  byId,
  handle(async (req) => {
    await plans.deleteEwPlan(req.params.id, actor(req));
    return { deleted: true };
  }),
);

