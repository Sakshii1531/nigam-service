// Which Brand Panel page needs which permission (docs/brand-crm Phase 2).
// Mirrors the backend's brandAccess.js for the pages' main API: the server is
// what actually enforces access — this only hides menu items and shows a
// Forbidden page instead of a screen full of failed requests.
//
// [path, keys — any one is enough]. A path covers its sub-paths
// (/brand-admin/warranty-claims covers /brand-admin/warranty-claims/:id).
// Brand pages not listed here (notifications, chat, change password) are open
// to every brand user.
export const BRAND_PAGE_ACCESS = Object.freeze([
  ['/brand-admin/audit-log', ['audit:view']],
  ['/brand-admin/dashboard', ['dashboard:view']],
  ['/brand-admin/requests', ['tickets:create']],
  ['/brand-admin/my-work',['tickets:view']],
  ['/brand-admin/tickets',['tickets:view']],
  ['/brand-admin/complaints', ['tickets:view']],
  ['/brand-admin/complaint-monitoring', ['tickets:view']],
  ['/brand-admin/warranty-claims', ['tickets:view']],
  ['/brand-admin/escalations', ['escalations:view']],
  // Also covers Customer 360 profile routes /customers/:id.
  ['/brand-admin/customers', ['customers:view']],
  ['/brand-admin/service-completion', ['operations:view']],
  ['/brand-admin/service-providers', ['operations:view']],
  ['/brand-admin/amcs', ['operations:view']],
  ['/brand-admin/exchanges', ['operations:view']],
  ['/brand-admin/replacement-approvals', ['operations:view']],
  ['/brand-admin/reverse-logistics', ['operations:view']],
  ['/brand-admin/documents', ['operations:view']],
  ['/brand-admin/part-requests', ['parts:view']],
  ['/brand-admin/inventory', ['parts:view']],
  ['/brand-admin/parts-claims', ['parts:view']],
  ['/brand-admin/catalog', ['catalog:view']],
  ['/brand-admin/warranty', ['warranty:view']],
  ['/brand-admin/warranty-settings', ['warranty:view']],
  ['/brand-admin/invoices', ['billing:view']],
  ['/brand-admin/call-rates', ['rates:view']],
  ['/brand-admin/payments', ['payments:view']],
  ['/brand-admin/reports', ['reports:view']],
  ['/brand-admin/reviews', ['engagement:view']],
  ['/brand-admin/academy', ['engagement:view']],
  ['/brand-admin/users', ['users:view', 'roles:manage']],
  ['/brand-admin/teams', ['users:view', 'teams:edit']],
  ['/brand-admin/settings', ['settings:view', 'sla:edit', 'integrations:manage']],
]);

const covers = (page, path) => path === page || path.startsWith(`${page}/`);

/** Permission keys a brand path needs, or null when any brand user may open it. */
export function pageAccess(path) {
  const clean = path.replace(/\/+$/, '') || '/';
  const hit = BRAND_PAGE_ACCESS.find(([page]) => covers(page, clean));
  return hit ? hit[1] : null;
}

/** First page this user may open — where the Forbidden page sends them. */
export function firstAllowedPage(can) {
  const hit = BRAND_PAGE_ACCESS.find(([, keys]) => can(...keys));
  return hit ? hit[0] : '/brand-admin/notifications';
}
