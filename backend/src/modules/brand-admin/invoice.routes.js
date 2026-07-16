import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as invoiceService from './invoice.service.js';
import { createInvoiceSchema, updateInvoiceStatusSchema, listInvoicesQuerySchema, idParamSchema } from './invoice.validation.js';

export const invoiceRouter = Router();
invoiceRouter.use(requireAuth, requireBrandScope);

invoiceRouter.get('/', validate(listInvoicesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await invoiceService.listInvoices(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

invoiceRouter.post('/', validate(createInvoiceSchema), async (req, res, next) => {
  try {
    created(res, await invoiceService.createInvoice(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

invoiceRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await invoiceService.getInvoice(req.user.brand, req.params.id));
  } catch (err) {
    next(err);
  }
});

invoiceRouter.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateInvoiceStatusSchema), async (req, res, next) => {
  try {
    ok(res, await invoiceService.updateInvoiceStatus(req.user.brand, req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
});
