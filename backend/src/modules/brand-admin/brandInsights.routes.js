import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as brandInsights from './brandInsights.service.js';
import { z } from 'zod';
import {
  listCustomersQuerySchema,
  listPaginatedQuerySchema,
  listWarrantyQuerySchema,
  listAmcQuerySchema,
  listClaimsQuerySchema,
  listPartOrdersQuerySchema,
  listPaymentsQuerySchema,
  listPayoutsQuerySchema,
} from './brandInsights.validation.js';

export const brandInsightsRouter = Router();
brandInsightsRouter.use(requireAuth, requireBrandScope);

brandInsightsRouter.get('/customers', validate(listCustomersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandCustomers(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/technicians', validate(listPaginatedQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandTechnicians(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/completions', validate(listPaginatedQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandCompletions(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/warranty-registrations', validate(listWarrantyQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandWarrantyRegistrations(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/amc-subscriptions', validate(listAmcQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandAmcSubscriptions(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/claims', validate(listClaimsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandClaims(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/dashboard', async (req, res, next) => {
  try {
    ok(res, await brandInsights.getBrandDashboard(req.user.brand));
  } catch (err) {
    next(err);
  }
});

const reportsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

brandInsightsRouter.get('/reports', validate(reportsQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await brandInsights.getBrandReports(req.user.brand, req.query));
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/part-orders', validate(listPartOrdersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandPartOrders(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.patch('/part-orders/:id', async (req, res, next) => {
  try {
    const { status, scheduledDate, timeSlot, notes } = req.body;
    if (!['Pending', 'Approved', 'Dispatched', 'Rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid status value');
    }
    const updated = await brandInsights.updateBrandPartOrderStatus(req.user.brand, req.params.id, {
      status,
      scheduledDate,
      timeSlot,
      notes,
    });
    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/inventory', validate(listPaginatedQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandInventory(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/payments/customer', validate(listPaymentsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandCustomerPayments(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/payments/payouts', validate(listPayoutsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandTechnicianPayouts(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

brandInsightsRouter.get('/payments/dues', validate(listPaginatedQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await brandInsights.listBrandPendingDues(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

const warrantyLookupSchema = z.object({ query: z.string().min(1) });

brandInsightsRouter.get('/warranty-lookup', validate(warrantyLookupSchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await brandInsights.lookupBrandWarranty(req.user.brand, req.query));
  } catch (err) {
    next(err);
  }
});
