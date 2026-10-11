import { BRAND_ROUTE_RULES } from './brandAccess.js';
import { AUDIT_ADAPTERS, ADMIN_AUDIT_ADAPTERS } from './auditMutations.js';
const native = [
  ['/api-keys', 'API key management recordAction'],
  ['/tickets', 'Ticket single writer (timeline → normalized audit)'],
  ['/warranty-claims', 'Legacy ticket aliases use the same single writer'],
  ['/customers', 'Customer service recordAction'],
  ['/warranty-policies', 'Policy service recordAction; serial import counts only'],
  ['/parts', 'Part decisions mirror into the ticket audit'],
  ['/rates', 'Rate transaction audit'],
  ['/billing/billing-profile', 'Billing profile recordAction'],
  ['/roles', 'Role service recordAction'], ['/users', 'User service recordAction + auth events'],
  ['/teams', 'Team service recordAction'],
  ['/settings/sla', 'SLA settings recordAction'], ['/settings/escalation-matrix', 'Matrix recordAction'],
];
export const BRAND_AUDIT_COVERAGE = BRAND_ROUTE_RULES.filter(([method])=>['POST','PUT','PATCH','DELETE'].includes(method))
  .map(([method,path])=>{
    const adapter=AUDIT_ADAPTERS.find(([m,p])=>m===method&&p.replace(/:[A-Za-z]+/g,':id')===path.replace(/:[A-Za-z]+/g,':id'));
    const readOnly=['/tickets/preview-warranty','/warranty-policies/test'].includes(path);
    const writer=native.find(([prefix])=>path===prefix||path.startsWith(prefix+'/'));
    return {method,path,status:readOnly?'read-only':adapter?'added':writer?'existing':'gap',
      detail:readOnly?'Input evaluation; no persisted mutation':adapter?adapter[3]:writer?.[1]||'Unexplained gap'};
  });
export const ADMIN_AUDIT_COVERAGE = ADMIN_AUDIT_ADAPTERS.map(([method,path,,action])=>({method,path,action}));
