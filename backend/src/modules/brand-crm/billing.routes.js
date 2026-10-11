import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRole, requirePermission } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok } from '../../utils/respond.js';
import { Brand } from '../super-admin/brand.model.js';
import { actorFromReq } from './actor.js';
import { addOtherCharge } from './charges.service.js';
import * as billing from './billing.service.js';
const id = z.string().refine(mongoose.isValidObjectId, 'Invalid ID');
const wrap = fn => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    next(e instanceof z.ZodError ? new ApiError(400, 'Invalid billing input', {
      issues: e.issues
    }) : e);
  }
};
function router(admin = false) {
  const r = Router();
  if (admin) r.use(requireAuth, requireRole('super_admin'), requirePermission('billing:manage'));
  r.use((req, res, next) => {
    try {
      req.query = z.object({
        brand: id.optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        dateField: z.enum(['createdAt','issuedAt']).optional(),
        state: z.string().max(100).optional(),
        city: z.string().max(100).optional(),
        q: z.string().max(200).optional(),
        type: z.enum(['lines', 'invoices', 'payments']).optional(),
        status: z.enum(['outstanding', 'unbilled', 'pending_closure', 'billable', 'invoiced', 'void', 'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled']).optional()
      }).parse(req.query);
      next();
    } catch (e) {
      next(new ApiError(400, 'Invalid billing filters', {
        issues: e.issues
      }));
    }
  });
  const brand = req => admin ? req.query.brand ? id.parse(req.query.brand) : null : req.user.brand;
  r.get('/summary', wrap(async (req, res) => ok(res, await billing.brandSummary(brand(req), req.query))));
  r.get('/lines', wrap(async (req, res) => ok(res, await billing.listLines(brand(req), req.query))));
  r.get('/invoices', wrap(async (req, res) => ok(res, await billing.listInvoices(brand(req), req.query))));
  r.get('/invoices/:id', wrap(async (req, res) => ok(res, await billing.getInvoice(id.parse(req.params.id), brand(req), {includePayments:admin || req.brandAccess.permissions.has('payments:view')}))));
  r.get('/invoices/:id/pdf', wrap(async (req, res) => {
    const invoice = await billing.getInvoice(id.parse(req.params.id), brand(req));
    res.type('html').set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'").send(billing.printableInvoice(invoice));
  }));
  r.get('/payments', wrap(async (req, res) => ok(res, await billing.listPayments(brand(req), req.query))));
  r.get('/export', wrap(async (req, res) => res.type('text/csv').attachment('brand-billing.csv').send(await billing.exportBilling(brand(req), req.query))));
  const getProfile = async req => {
    const b = await Brand.findById(brand(req)).select('billing name').lean();
    if (!b) throw new ApiError(404, 'Brand not found');
    return b;
  };
  r.get('/billing-profile', wrap(async (req, res) => ok(res, (await getProfile(req)).billing)));
  r.put('/billing-profile', wrap(async (req, res) => {
    const changes = z.object({
      gstin: z.string().trim().max(15).refine(v => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), 'Invalid GSTIN').optional(),
      legalName: z.string().trim().min(1).max(200).optional(),
      billingAddress: z.string().trim().max(2000).optional()
    }).strict().parse(req.body);
    ok(res, await billing.updateBrandBilling(brand(req), changes, await actorFromReq(req), 'billing.profile_updated'));
  }));
  if (admin) {
    r.get('/ageing', wrap(async (req, res) => ok(res, await billing.ageingReport(req.query))));
    r.post('/invoices', wrap(async (req, res) => {
      const data = z.object({
        brand: id,
        periodFrom: z.coerce.date(),
        periodTo: z.coerce.date()
      }).strict().parse(req.body);
      ok(res, await billing.draftInvoice(data.brand, {
        ...data,
        actor: await actorFromReq(req)
      }));
    }));
    r.post('/invoices/:id/issue', wrap(async (req, res) => ok(res, await billing.issueInvoice(id.parse(req.params.id), await actorFromReq(req)))));
    r.post('/invoices/:id/cancel', wrap(async (req, res) => {
      const {
        reason
      } = z.object({
        reason: z.string().trim().min(1).max(1000)
      }).strict().parse(req.body);
      ok(res, await billing.cancelInvoice(id.parse(req.params.id), reason, await actorFromReq(req)));
    }));
    r.post('/invoices/:id/payments', wrap(async (req, res) => {
      const data = z.object({
        amount: z.number().positive().max(100000000),
        mode: z.enum(['neft', 'rtgs', 'bank_transfer', 'upi', 'cheque', 'cash', 'other']),
        reference: z.string().trim().min(1).max(200),
        receivedAt: z.coerce.date().optional(),
        note: z.string().max(1000).optional()
      }).strict().parse(req.body);
      ok(res, await billing.recordPayment(id.parse(req.params.id), data, await actorFromReq(req)));
    }));
    r.put('/brands/:id/terms', wrap(async (req, res) => {
      const brandId = id.parse(req.params.id);
      const data = z.object({
        paymentTermsDays: z.number().int().min(0).max(365),
        gstPercent: z.number().min(0).max(100)
      }).strict().parse(req.body);
      ok(res, await billing.updateBrandBilling(brandId, data, await actorFromReq(req), 'billing.terms_updated'));
    }));
    r.post('/lines/:id/charges', wrap(async (req, res) => {
      const data = z.object({
        label: z.string().trim().min(1).max(150),
        amount: z.number().finite().min(0).max(100000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001),
        reason: z.string().trim().min(1).max(1000)
      }).strict().parse(req.body);
      ok(res, await addOtherCharge(id.parse(req.params.id), await actorFromReq(req), data));
    }));
  }
  return r;
}
export const brandBillingRouter = router();
export const adminBrandBillingRouter = router(true);
