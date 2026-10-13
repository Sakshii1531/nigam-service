import { requireBrandPermission } from '../brand-crm/brandPermission.middleware.js';
import { actorFromReq } from '../brand-crm/actor.js';
import { recordAction } from '../shared/auditLog.js';
import { csv } from '../../utils/csv.js';

export async function sendOperationsCsv(req, res, report, rows) {
  await new Promise((resolve, reject) => requireBrandPermission('reports:export')(req, res, e => e ? reject(e) : resolve()));
  await recordAction({ brand: req.user.brand, actor: await actorFromReq(req), entityType: 'BrandReport', action: 'report.exported', meta: { report, rows: rows.length - 1, filters: req.query } });
  res.attachment(`brand-${report}.csv`).type('text/csv').send(csv(rows));
}
