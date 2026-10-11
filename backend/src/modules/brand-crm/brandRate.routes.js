import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAuth, requireRole, requirePermission } from '../../middleware/auth.js';
import { ROLES } from '../../config/constants.js';
import { ok } from '../../utils/respond.js';
import { actorFromReq } from './actor.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as rates from './brandRate.service.js';
import { resolveRate } from './rateResolver.js';
import { addOtherCharge } from './charges.service.js';
const wrap = fn => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    next(e instanceof z.ZodError ? new ApiError(400, 'Invalid rate input', {
      issues: e.issues
    }) : e);
  }
};
function router(admin = false) {
  const r = Router();
  if (admin) r.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));
  const brand = req => {
    const value = admin ? req.query.brand || req.body.brand : req.user.brand;
    if (!value || !mongoose.isValidObjectId(value)) throw new ApiError(400, 'Select a valid brand');
    return value;
  };
  const body = req => {
    const value = {
      ...req.body
    };
    if (admin) delete value.brand;
    return value;
  };
  r.get('/options', wrap(async (req, res) => ok(res, await rates.options(admin ? null : brand(req)))));
  r.get('/resolve', wrap(async (req, res) => {
    const input = z.object({
      categoryId: z.string().refine(mongoose.isValidObjectId),
      serviceType: z.string(),
      state: z.string().optional(),
      city: z.string().optional(),
      at: z.coerce.date().optional()
    }).parse(req.query);
    const result = await resolveRate({
      ...input,
      brand: brand(req)
    });
    ok(res, {
      ...result,
      row: rates.rateView(result.row, admin)
    });
  }));
  r.get('/export', wrap(async (req, res) => res.type('text/csv').attachment('brand-rates.csv').send(await rates.exportRates(brand(req), req.query, admin))));
  r.post('/import', wrap(async (req, res) => {
    const data = z.object({
      csv: z.string(),
      dryRun: z.boolean().default(true)
    }).parse(body(req));
    ok(res, await rates.importRates(brand(req), await actorFromReq(req), data, admin));
  }));
  r.get('/', wrap(async (req, res) => ok(res, (await rates.listRates(admin && !req.query.brand ? null : brand(req), req.query)).map(row => rates.rateView(row, admin)))));
  r.post('/', wrap(async (req, res) => ok(res, rates.rateView(await rates.mutateRate(brand(req), await actorFromReq(req), body(req), {
    admin
  }), admin))));
  r.patch('/:id', wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid rate ID');
    ok(res, rates.rateView(await rates.mutateRate(brand(req), await actorFromReq(req), body(req), {
      id: req.params.id,
      admin
    }), admin));
  }));
  r.post('/:id/deactivate', wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid rate ID');
    ok(res, rates.rateView(await rates.mutateRate(brand(req), await actorFromReq(req), {}, {
      id: req.params.id,
      admin,
      deactivate: true
    }), admin));
  }));
  return r;
}
export const brandRateRouter = router();
export const adminBrandRateRouter = router(true);
export const adminBillingLineRouter = Router();
adminBillingLineRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN), requirePermission('billing:manage'));
adminBillingLineRouter.post('/:id/charges', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid billing line ID');
  const data = z.object({
    label: z.string().trim().min(1).max(150),
    amount: z.number().finite().min(0).max(100000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001),
    reason: z.string().trim().min(1).max(1000)
  }).strict().parse(req.body);
  ok(res, await addOtherCharge(req.params.id, await actorFromReq(req), data));
}));
