import mongoose from 'mongoose';
import { recordAction } from '../shared/auditLog.js';
import { fieldDiff } from '../shared/auditContext.js';
import { actorFromReq } from './actor.js';

// Explicit adapters for legacy handlers without domain audit writers. This is
// separate from the safety net: each adapter names its entity and action and
// reads persisted before/after values rather than trusting request values.
export const AUDIT_ADAPTERS = [
  ...[['master-services','MasterService'],['sub-brands','SubBrand'],['products','BrandProduct']].flatMap(([path, model]) => [
    ['POST', path === 'products' ? '/catalog/sub-brands/:subBrandId/products' : `/catalog/${path}`, model, 'catalog_item.created'],
    ['PUT', `/catalog/${path}/:id`, model, 'catalog_item.updated'],
    ['DELETE', `/catalog/${path}/:id`, model, 'catalog_item.deleted'],
  ]),
  ...[['guides','TrainingGuide'],['courses','Course']].flatMap(([path, model]) => [
    ['POST', `/academy/${path}`, model, 'academy_item.created'],
    ...(path === 'courses' ? [['PUT', `/academy/${path}/:id`, model, 'academy_item.updated']] : []),
    ['DELETE', `/academy/${path}/:id`, model, 'academy_item.deleted'],
  ]),
  ['POST','/tickets/:id/call',null,'ticket.call_started'],
  ['POST','/documents','GeneratedDocument','document.generated'],
  ['POST','/replacement-approvals','ReplacementApproval','replacement.created'],
  ['PATCH','/replacement-approvals/:id/status','ReplacementApproval','replacement.status_changed'],
  ['POST','/returns','ReverseLogisticsReturn','return.created'],
  ['PATCH','/returns/:id','ReverseLogisticsReturn','return.updated'],
  ['PUT','/settings','BrandSettings','settings.updated','singleton'],
  ['PUT','/warranty-coverage','Brand','settings.coverage_changed','brand'],
  ['PUT','/warranty-webhook','Brand','webhook.updated','brand'],
  ['POST','/warranty-webhook/test',null,'webhook.tested'],
  ['POST','/actions/notify-customer',null,'customer.notified'],
  ['POST','/actions/amc/:id/renewal-reminder',null,'subscription.renewal_reminded'],
  ['POST','/actions/amc/:id/visits',null,'subscription.visit_scheduled'],
  ['PATCH','/part-orders/:id','PartOrder','part.updated'],
  ['POST','/escalations','Escalation','escalation.created'],
  ['PATCH','/escalations/:id','Escalation','escalation.updated'],
  ['PATCH','/escalations/:id/status','Escalation','escalation.status_changed'],
  ['POST','/escalations/:id/resolve','Escalation','escalation.resolved'],
];
export const ADMIN_AUDIT_ADAPTERS = [
  ['POST','/brands','Brand','brand.created'],
  ['PUT','/brands/:id','Brand','brand.updated','brand'],
  ['DELETE','/brands/:id','Brand','brand.deleted','brand'],
  ['POST','/brand-admins','User','user.created'],
  ['PUT','/brand-admins/:id','User','user.updated'],
  ['PATCH','/users/:id/status','User','user.status_changed'],
  ['DELETE','/users/:id','User','user.deleted'],
  ['PATCH','/brand-admins/:id/temporary-password','User','auth.password_reset'],
  ['PUT','/warranty-catalog/brands/:id','Brand','settings.coverage_changed','brand'],
  ['PATCH','/part-orders/:id','PartOrder','part.updated'],
  ['POST','/escalations','Escalation','escalation.created'],
  ...['assign','status','priority'].map(verb => ['PATCH',`/escalations/:id/${verb}`,'Escalation',`escalation.${verb}_changed`]),
];
function match(descriptors, req) {
  for (const [method, path, model, action, scope] of descriptors) {
    if (req.method !== method) continue;
    const keys = [];
    const pattern = path.replace(/:([A-Za-z]+)/g, (_, key) => { keys.push(key); return '([^/]+)'; });
    const hit = req.path.match(new RegExp(`^${pattern}/?$`));
    if (hit) return { model, action, scope, params: Object.fromEntries(keys.map((key, i) => [key, hit[i + 1]])) };
  }
  return null;
}
function responseData(body) {
  const data = body?.data;
  return data && !Array.isArray(data) ? data : {};
}
async function read(descriptor, brand, entityId, admin) {
  if (!descriptor?.model) return {};
  const Model = mongoose.model(descriptor.model);
  let query;
  if (descriptor.scope === 'singleton') query = { brand };
  else {
    if (!mongoose.isValidObjectId(entityId)) return {};
    query = { _id: entityId };
    if (!admin) {
      if (descriptor.model === 'Brand') query._id = brand;
      else query.brand = brand;
    }
  }
  const doc = await Model.findOne(query).lean();
  return doc || {};
}
export function mutationAudit({ admin = false, prefix = '' } = {}) {
  return async (req, res, next) => {
    if (!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
    const requestPath = prefix + req.path;
    const descriptor = match(admin ? ADMIN_AUDIT_ADAPTERS : AUDIT_ADAPTERS, {method:req.method,path:requestPath});
    if (admin && !descriptor) return next(); // Other admin domains retain their own writers.
    // These POSTs only evaluate input; dry-run imports do not change data.
    const readOnly = ['/tickets/preview-warranty','/warranty-policies/test'].includes(req.path) || (['/warranty-policies/serials/import','/rates/import'].includes(req.path) && req.body?.dryRun !== false);
    if (readOnly) return next();
    try {
      const brand = req.user?.brand;
      const before = await read(descriptor, brand, descriptor?.scope === 'brand' && !admin ? brand : descriptor?.params.id, admin);
      const json = res.json;
      res.json = function (body) {
        res.json = json;
        if (res.statusCode < 200 || res.statusCode >= 300) return json.call(res, body);
        const finish = async () => {
          if (descriptor) {
            const data = responseData(body);
            const entityId = descriptor.params.id || data.id || data._id || (descriptor.scope === 'brand' ? brand : null);
            const after = req.method === 'DELETE' ? {} : await read(descriptor, brand, entityId, admin);
            const owner = admin ? (descriptor.model === 'Brand' ? entityId : after.brand || before.brand || data.brand) : brand;
            const fields = req.method === 'DELETE' ? Object.keys(before) : req.method === 'POST' ? Object.keys(after) : [...Object.keys(req.body || {}), ...(req.body?.rotateSecret ? ['webhook'] : []), ...(admin && descriptor.model === 'User' ? ['assignedRoles'] : [])];
            const changes = fieldDiff(before, after, fields.filter(k => !['_id','__v','createdAt','updatedAt'].includes(k)));
            if (admin && descriptor.model === 'User' && owner && changes.assignedRoles) await recordAction({brand:owner,entityType:'user',entityId,action:'auth.roles_changed',actor:await actorFromReq(req),meta:{changes:{roles:changes.assignedRoles}}});
            if (admin && descriptor.model === 'User' && owner && changes.status?.[1] === 'Suspended') await recordAction({brand:owner,entityType:'user',entityId,action:'auth.suspended',actor:await actorFromReq(req),meta:{changes:{status:changes.status}}});
            if (descriptor.action === 'auth.password_reset') changes.password = 'changed';
            await recordAction({ brand: owner || null, entityType: descriptor.action.split('.')[0], entityId: mongoose.isValidObjectId(entityId) ? entityId : null,
              action: descriptor.action, actor: await actorFromReq(req), reason: req.body?.reason || req.body?.resolution || req.body?.note,
              meta: { changes, method: req.method, path: requestPath, ...(req.body?.rotateSecret ? { secret: 'changed' } : {}) } });
          } else if (!res.locals.audited) {
            await recordAction({ brand, entityType: 'http', action: 'http.mutation', actor: await actorFromReq(req), meta: { method: req.method, path: requestPath } });
            if (process.env.NODE_ENV === 'test') console.warn(`Unaudited brand mutation: ${req.method} ${requestPath}`);
          }
          json.call(res, body);
        };
        finish().catch(next);
        return res;
      };
      next();
    } catch (e) { next(e); }
  };
}
export const auditMutations = mutationAudit();
