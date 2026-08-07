import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { ExtendedWarrantyPlan } from '../warranty-amc-exchange/extendedWarrantyPlan.model.js';

// Super-admin CRUD for the extension packs the customer app sells. The customer
// side reads them at GET /warranty-amc/extended-warranty/plans.
export const extendedWarrantyPlanRouter = Router();
extendedWarrantyPlanRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

const planSchema = z.object({
  name: z.string().min(1),
  durationYears: z.coerce.number().int().min(1).max(10),
  price: z.coerce.number().min(0),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  applianceCategory: z.string().nullable().optional(),
  claimsTotal: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const idParamSchema = z.object({ id: z.string().length(24) });

extendedWarrantyPlanRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await ExtendedWarrantyPlan.find().sort({ durationYears: 1, price: 1 }));
  } catch (err) {
    next(err);
  }
});

extendedWarrantyPlanRouter.post('/', validate(planSchema), async (req, res, next) => {
  try {
    created(res, await ExtendedWarrantyPlan.create(req.body));
  } catch (err) {
    next(err);
  }
});

extendedWarrantyPlanRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(planSchema.partial()),
  async (req, res, next) => {
    try {
      const plan = await ExtendedWarrantyPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!plan) throw new ApiError(404, 'Extended warranty plan not found');
      ok(res, plan);
    } catch (err) {
      next(err);
    }
  },
);

extendedWarrantyPlanRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const plan = await ExtendedWarrantyPlan.findByIdAndDelete(req.params.id);
    if (!plan) throw new ApiError(404, 'Extended warranty plan not found');
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
