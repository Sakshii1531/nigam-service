import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { ok, created } from '../../utils/respond.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { requireBrandPermission } from './brandPermission.middleware.js';
import { actorFromReq } from './actor.js';
import * as customers from './customer360.service.js';
import { listCustomerSchema, searchCustomerSchema, createCustomerSchema, updateCustomerSchema, addressSchema } from './customer360.validation.js';
export const customer360Router = Router();
const EXPORT_LIMIT = 5000;
const csvCell = value => {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
customer360Router.get('/', validate(listCustomerSchema, 'query'), (req, res, next) => {
  if (req.query.format === 'csv') return requireBrandPermission('customers:export')(req, res, next);
  next();
}, async (req, res, next) => {
  try {
    const exporting = req.query.format === 'csv';
    const result = await customers.listCustomers(req.user.brand, { ...req.query, ...(exporting ? { exportLimit: EXPORT_LIMIT } : {}) });
    if (!exporting) return ok(res, result.items, result.meta);
    if (result.meta.total > EXPORT_LIMIT) throw new ApiError(400, 'Export exceeds 5000 customers. Narrow your search');
    const keys = ['humanId', 'name', 'phone', 'email', 'productCount', 'totalTickets', 'openTickets', 'lastActivity'];
    const rows = [keys, ...result.items.map(row => keys.map(key => row[key] instanceof Date ? row[key].toISOString() : row[key]))];
    res.type('text/csv').attachment('brand-customers.csv').send('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'));
  } catch (err) { next(err); }
});
customer360Router.get('/search', validate(searchCustomerSchema, 'query'), async (req, res, next) => {
  try { ok(res, await customers.searchByPhone(req.user.brand, req.query.phone)); } catch (err) { next(err); }
});
customer360Router.post('/', validate(createCustomerSchema), async (req, res, next) => {
  try { created(res, await customers.createCustomer(req.user.brand, await actorFromReq(req), req.body)); } catch (err) { next(err); }
});
customer360Router.get('/:id', async (req, res, next) => {
  try { ok(res, await customers.getProfile(req.user.brand, req.params.id)); } catch (err) { next(err); }
});
customer360Router.patch('/:id', validate(updateCustomerSchema), async (req, res, next) => {
  try { ok(res, await customers.updateCustomer(req.user.brand, req.params.id, await actorFromReq(req), req.body)); } catch (err) { next(err); }
});
customer360Router.post('/:id/addresses', validate(addressSchema), async (req, res, next) => {
  try { created(res, await customers.addAddress(req.user.brand, req.params.id, await actorFromReq(req), req.body)); } catch (err) { next(err); }
});
