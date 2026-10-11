import { Router } from 'express';
import { once } from 'node:events';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import { AuditLog } from '../super-admin/auditLog.model.js';
import { recordAction } from '../shared/auditLog.js';
import { actorFromReq } from './actor.js';
import { auditQuerySchema, auditQuery, listBrandAudit, AUDIT_CSV_COLUMNS, csvCell, auditCsvRow } from './brandAudit.service.js';

export const brandAuditRouter = Router();
brandAuditRouter.get('/', validate(auditQuerySchema, 'query'), async (req, res, next) => {
  try {
    if (!req.query.format) {
      const result = await listBrandAudit(req.user.brand, req.query);
      return ok(res, result.items, result.meta);
    }
    const query = auditQuery(req.user.brand, req.query);
    // Bound the snapshot before writing the export event; it does not export itself.
    const cutoff = new Date();
    query.$and = [...(query.$and || []),{createdAt:{$lt:cutoff}}];
    await recordAction({brand:req.user.brand,entityType:'audit',action:'audit.exported',actor:await actorFromReq(req),meta:{filters:req.query}});
    res.attachment('brand-audit-log.csv').type('text/csv; charset=utf-8');
    const write = async text => {
      if (res.destroyed) throw new Error('Export cancelled');
      if (!res.write(text)) {
        const controller = new AbortController(), cancel = () => controller.abort();
        res.once('close',cancel);
        try { await once(res,'drain',{signal:controller.signal}); } finally {res.off('close',cancel);}
      }
    };
    await write('\uFEFF'+AUDIT_CSV_COLUMNS.map(csvCell).join(',')+'\r\n');
    const cursor = AuditLog.find(query).sort({createdAt:-1,_id:-1}).lean().cursor();
    try { for await (const row of cursor) await write(auditCsvRow(row)); } finally { await cursor.close(); }
    res.end();
  } catch (e) { if (res.headersSent) res.destroy(e); else next(e); }
});
