import { Router } from 'express';
import { once } from 'node:events';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ok } from '../../utils/respond.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { requireBrandPermission } from './brandPermission.middleware.js';
import { actorFromReq } from './actor.js';
import { AuditLog } from '../super-admin/auditLog.model.js';
import { Brand } from '../super-admin/brand.model.js';
import * as reports from './brandReports.service.js';
const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  categoryKey: z.string().max(100).optional(),
  serviceType: z.enum(['repair', 'installation', 'demo', 'preventive_maintenance', 'inspection', 'visit_only']).optional(),
  productType: z.string().refine(mongoose.isValidObjectId).optional(),
  status: z.string().max(80).optional(),
  source: z.enum(['ncc_app', 'toll_free', 'brand_manual', 'whatsapp', 'api']).optional(),
  format: z.enum(['csv', 'xlsx']).optional()
}).strict();
const wrap = fn => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (res.headersSent) {
      res.destroy(e);
      return;
    }
    next(e instanceof z.ZodError ? new ApiError(400, 'Invalid report filters', {
      issues: e.issues
    }) : e);
  }
};
export const brandReportsRouter = Router();
brandReportsRouter.get('/options', wrap(async (req, res) => ok(res, await reports.reportOptions(req.user.brand))));
brandReportsRouter.get('/:report', wrap(async (req, res) => {
  const query = querySchema.parse(req.query);
  if (query.format) await new Promise((resolve, reject) => requireBrandPermission('reports:export')(req, res, e => e ? reject(e) : resolve()));
  const data = await reports.getReport(req.user.brand, req.params.report, query);
  if (!query.format) return ok(res, data);
  const brand = await Brand.findById(req.user.brand).select('ticketPrefix').lean();
  const filename = `${brand.ticketPrefix}-${req.params.report}-${query.from?.toISOString().slice(0, 10) || 'all'}-${query.to?.toISOString().slice(0, 10) || 'all'}.${query.format}`;
  const actor = await actorFromReq(req);
  await AuditLog.create({
    brand: req.user.brand,
    actor,
    user: actor.user,
    type: 'Finance',
    entityType: 'BrandReport',
    action: 'report.exported',
    meta: {
      report: req.params.report,
      filters: query,
      rows: data.rows.length
    }
  });
  const cell = (row, c) => c.type === 'rates' ? (row[c.key] || []).map(r => `${r.amount} x ${r.calls}`).join('; ') : row[c.key] ?? '';
  res.attachment(filename);
  if (query.format === 'csv') {
    res.type('text/csv');
    const escape = value => {
      let s = String(value);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const write = async text => {
      if (res.destroyed) throw new Error('Export cancelled');
      if (!res.write(text)) {
        const controller = new AbortController();
        const cancel = () => controller.abort();
        res.once('close', cancel);
        try {
          await once(res, 'drain', {
            signal: controller.signal
          });
        } finally {
          res.off('close', cancel);
        }
      }
    };
    await write('\uFEFF' + data.columns.map(c => escape(c.label)).join(',') + '\r\n');
    for (const row of data.rows) await write(data.columns.map(c => escape(cell(row, c))).join(',') + '\r\n');
    return res.end();
  }
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: false
  });
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = data.columns.map(c => ({
    header: c.label,
    key: c.key,
    width: c.type === 'text' ? 28 : 22,
    style: {
      numFmt: c.type === 'money' ? '#,##0.00' : c.type === 'hours' || c.type === 'percent' ? '0.00' : 'General'
    }
  }));
  for (const row of data.rows) sheet.addRow(Object.fromEntries(data.columns.map(c => [c.key, cell(row, c)]))).commit();
  sheet.commit();
  await workbook.commit();
}));
