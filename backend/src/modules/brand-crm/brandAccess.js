import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { requireBrandPermission, ANY_BRAND_USER } from './brandPermission.middleware.js';

// Which permission every Brand Panel API route needs (docs/brand-crm Phase 2).
// One table instead of a guard sprinkled on each router, so the whole access
// model reads in one place — and it is DENY BY DEFAULT: a route under
// /api/v1/brand that no rule matches is refused, so a new endpoint can't ship
// unguarded by accident (tests/brandCrmRbac.test.js checks every route has a rule).
//
// [method, path relative to /api/v1/brand, keys — any one of them is enough]
// First match wins, so specific paths come before general ones.
export const BRAND_ROUTE_RULES = Object.freeze([
  ['GET','/tickets/:id/calls/:callId',['tickets:view']],
  ['GET','/my-work',['tickets:view']],
  ['GET','/tickets/communication-options',['tickets:view']],
  ...['contacts','call','reschedule','documents'].map(action=>['POST',`/tickets/:id/${action}`,['tickets:edit']]),
  ['GET','/warranty-policies',['warranty:view']],
  ['GET','/warranty-policies/options',['warranty:view']],
  ['GET','/warranty-policies/serials',['warranty:view']],
  ['GET','/warranty-policies/:id',['warranty:view']],
  ['POST','/warranty-policies',['warranty:policy_edit']],
  ['PUT','/warranty-policies/:id',['warranty:policy_edit']],
  ['DELETE','/warranty-policies/:id',['warranty:policy_edit']],
  ['POST','/warranty-policies/test',['warranty:view']],
  ['POST','/warranty-policies/serials/import',['warranty:policy_edit']],
  ['POST','/tickets/:id/warranty/override',['warranty:verify']],
  ['PATCH','/tickets/:id/product',['tickets:edit']],
  ['GET','/tickets',['tickets:view']],
  ['GET','/tickets/queue-options',['tickets:view']],
  ['GET','/tickets/export',['tickets:export']],
  ...['approve','reject','hold','resume','request-info','request-contact'].map(action=>['POST',`/tickets/:id/${action}`,['tickets:approve']]),
  ['POST','/tickets/:id/priority',['tickets:priority']],
  ['POST','/tickets/:id/notes',['tickets:edit']],
  ['POST','/tickets/:id/confirm-on-behalf',['tickets:edit']],
  ['GET', '/tickets/form-options', ['tickets:create']],
  ['GET','/tickets/:id/activity',['tickets:view']],
  ['GET','/tickets/:id',['tickets:view']],
  ['POST', '/tickets/preview-warranty', ['tickets:create']],
  ['POST', '/tickets', ['tickets:create']],
  ['POST', '/tickets/:id/assign-cce', ['tickets:assign']],
  // Tickets (partner-warranty claim queue)
  ['GET', '/warranty-claims', ['tickets:view']],
  ['GET', '/warranty-claims/:id', ['tickets:view']],
  ['POST', '/warranty-claims/:id/approve', ['tickets:approve']],
  ['POST', '/warranty-claims/:id/reject', ['tickets:approve']],
  ['POST', '/warranty-claims/:id/request-info', ['tickets:approve']],
  ['POST', '/warranty-claims/:id/notes', ['tickets:edit']],

  // Dashboard and reports
  ...[['GET','/api-keys'],['POST','/api-keys'],['PATCH','/api-keys/:id'],['POST','/api-keys/:id/revoke']].map(([method,path])=>[method,path,['integrations:manage']]),
  ['GET', '/audit-logs', ['audit:view']],
  ['GET', '/dashboard', ['dashboard:view']],
  ['GET', '/reports/options', ['reports:view']],
  ['GET', '/reports/:report', ['reports:view']],

  // Customers
  ['GET', '/customers', ['customers:view']],
  ['GET', '/customers/search', ['customers:view']],
  ['GET', '/customers/:id', ['customers:view']],
  ['POST', '/customers', ['customers:create']],
  ['PATCH', '/customers/:id', ['customers:edit']],
  ['POST', '/customers/:id/addresses', ['customers:edit']],
  ['POST', '/actions/notify-customer', ['customers:edit', 'tickets:edit']],

  // Warranty
  ['GET', '/warranty-registrations', ['warranty:view']],
  ['GET', '/warranty-lookup', ['warranty:view']],
  ['GET', '/warranty-coverage', ['warranty:view']],
  ['PUT', '/warranty-coverage', ['warranty:policy_edit']],

  ['GET', '/parts', ['parts:view']],
  ['POST', '/parts/:id/approve', ['parts:approve']],
  ['POST', '/parts/:id/reject', ['parts:approve']],
  // Spare parts
  ['GET', '/part-orders', ['parts:view']],
  ['PATCH', '/part-orders/:id', ['parts:approve']],
  ['GET', '/inventory', ['parts:view']],
  ['GET', '/claims', ['parts:view']],

  // Escalations
  ['GET', '/escalations/assignees', ['escalations:manage']],
  ['GET', '/escalations/open-count', ['escalations:view']],
  ['GET', '/escalations', ['escalations:view']],
  ['POST', '/escalations', ['escalations:manage']],
  ['PATCH', '/escalations/:id', ['escalations:manage']],
  ['POST', '/escalations/:id/resolve', ['escalations:manage']],
  ['PATCH', '/escalations/:id/status', ['escalations:manage']],

  // Money
  ...['/rates','/rates/options','/rates/resolve','/rates/export'].map(path=>['GET',path,['rates:view']]),
  ...['/rates','/rates/import','/rates/:id/deactivate'].map(path=>['POST',path,['rates:edit']]),
  ['PATCH','/rates/:id',['rates:edit']],
  ...['summary','lines','invoices','invoices/:id','invoices/:id/pdf'].map(path=>['GET',`/billing/${path}`,['billing:view']]),
  ['GET','/billing/payments',['payments:view']],
  ['GET','/billing/export',['billing:export']],
  ...['GET','PUT'].map(method=>[method,'/billing/billing-profile',['settings:edit']]),
  ['GET', '/payments/customer', ['payments:view']],
  ['GET', '/payments/payouts', ['payments:view']],

  // Operations
  ['GET', '/service-providers', ['operations:view']],
  ['GET', '/completions', ['operations:view']],
  ['GET', '/amc-subscriptions', ['operations:view']],
  ['POST', '/actions/amc/:id/renewal-reminder', ['operations:edit']],
  ['POST', '/actions/amc/:id/visits', ['operations:edit']],
  ['GET', '/replacement-approvals', ['operations:view']],
  ['GET', '/replacement-approvals/:id', ['operations:view']],
  ['POST', '/replacement-approvals', ['operations:edit']],
  ['PATCH', '/replacement-approvals/:id/status', ['operations:edit']],
  ['GET', '/returns', ['operations:view']],
  ['GET', '/returns/:id', ['operations:view']],
  ['POST', '/returns', ['operations:edit']],
  ['PATCH', '/returns/:id', ['operations:edit']],
  ['GET', '/documents', ['operations:view']],
  ['GET', '/documents/:id', ['operations:view']],
  ['POST', '/documents', ['operations:edit']],

  // Catalog
  ['GET', '/catalog/master-services', ['catalog:view']],
  ['POST', '/catalog/master-services', ['catalog:edit']],
  ['PUT', '/catalog/master-services/:id', ['catalog:edit']],
  ['DELETE', '/catalog/master-services/:id', ['catalog:edit']],
  ['GET', '/catalog/sub-brands', ['catalog:view']],
  ['POST', '/catalog/sub-brands', ['catalog:edit']],
  ['PUT', '/catalog/sub-brands/:id', ['catalog:edit']],
  ['DELETE', '/catalog/sub-brands/:id', ['catalog:edit']],
  ['GET', '/catalog/sub-brands/:id/products', ['catalog:view']],
  ['POST', '/catalog/sub-brands/:id/products', ['catalog:edit']],
  ['PUT', '/catalog/products/:id', ['catalog:edit']],
  ['DELETE', '/catalog/products/:id', ['catalog:edit']],

  // Engagement
  ['GET', '/academy/guides', ['engagement:view']],
  ['POST', '/academy/guides', ['engagement:edit']],
  ['DELETE', '/academy/guides/:id', ['engagement:edit']],
  ['GET', '/academy/courses', ['engagement:view']],
  ['POST', '/academy/courses', ['engagement:edit']],
  ['PUT', '/academy/courses/:id', ['engagement:edit']],
  ['DELETE', '/academy/courses/:id', ['engagement:edit']],

  // Administration
  ['GET', '/permissions/catalog', ['users:view', 'roles:manage', 'teams:edit']],
  ['GET', '/roles', ['users:view', 'roles:manage']],
  ['POST', '/roles', ['roles:manage']],
  ['PUT', '/roles/:id', ['roles:manage']],
  ['DELETE', '/roles/:id', ['roles:manage']],
  ['GET', '/users', ['users:view']],
  ['GET', '/users/:id', ['users:view']],
  ['POST', '/users', ['users:edit']],
  ['PUT', '/users/:id', ['users:edit']],
  ['GET', '/teams', ['users:view', 'teams:edit']],
  ['GET', '/teams/:id', ['users:view', 'teams:edit']],
  ['POST', '/teams', ['teams:edit']],
  ['PUT', '/teams/:id', ['teams:edit']],
  ['DELETE', '/teams/:id', ['teams:edit']],
  ['POST', '/teams/:id/members', ['teams:edit']],
  ['DELETE', '/teams/:id/members/:userId', ['teams:edit']],
  // Every brand user reads settings: the sidebar shows the brand's support
  // number from it. Changing them is the restricted part.
  ['GET', '/settings/sla', ['sla:edit']],
  ['PUT', '/settings/sla', ['sla:edit']],
  ['GET', '/settings/escalation-matrix', ['sla:edit']],
  ['PUT', '/settings/escalation-matrix', ['sla:edit']],
  ['GET', '/settings', [ANY_BRAND_USER]],
  ['PUT', '/settings', ['settings:edit']],
  ['GET', '/warranty-webhook', ['integrations:manage']],
  ['PUT', '/warranty-webhook', ['integrations:manage']],
  ['POST', '/warranty-webhook/test', ['integrations:manage']],
]);

function compile(path) {
  const pattern = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z]+/g, '[^/]+');
  return new RegExp(`^${pattern}/?$`);
}

const COMPILED = BRAND_ROUTE_RULES.map(([method, path, keys]) => ({ method, path, keys, re: compile(path) }));

/** The rule for a request, or null. HEAD is treated as GET. */
export function ruleFor(method, path) {
  const m = method === 'HEAD' ? 'GET' : method;
  return COMPILED.find((r) => r.method === m && r.re.test(path)) || null;
}

function enforce(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const rule = ruleFor(req.method, req.path);
  if (!rule) return next(new ApiError(403, 'No access rule for this brand route'));
  return requireBrandPermission(...rule.keys)(req, res, next);
}

/** Mounted once at /api/v1/brand, ahead of every brand router. */
export const brandAccessControl = [requireAuth, requireBrandScope, enforce];
