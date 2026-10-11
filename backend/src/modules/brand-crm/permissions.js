// Brand permission catalogue and role templates (docs/brand-crm ARCHITECTURE §6).
// The one source of truth for brand permission keys: seeded into the Permission
// collection (scope 'brand'), served to the role editor, and checked by
// requireBrandPermission on every brand route.
//
// Keys are `module:action`. They never collide with the platform keys in
// scripts/seed.js (users:manage, teams:manage, …) — the Permission collection
// is keyed globally, so the brand side uses users:edit / teams:edit instead.

const MODULES = [
  { module: 'dashboard', label: 'Dashboard', actions: [['view', 'View dashboard']] },
  {
    module: 'tickets',
    label: 'Tickets',
    actions: [
      ['view', 'View tickets'],
      ['create', 'Register tickets'],
      ['edit', 'Notes, documents, contact, reschedule'],
      ['assign', 'Assign to a CCE'],
      ['priority', 'Change priority'],
      ['approve', 'Approve / reject / hold / request information'],
      ['export', 'Export tickets'],
    ],
  },
  {
    module: 'customers',
    label: 'Customers',
    actions: [
      ['view', 'View customers'],
      ['create', 'Create customers'],
      ['edit', 'Edit customers'],
      ['export', 'Export customers'],
    ],
  },
  {
    module: 'warranty',
    label: 'Warranty',
    actions: [
      ['view', 'View warranty status and policies'],
      ['verify', 'Override a warranty verdict'],
      ['policy_edit', 'Edit warranty policies and coverage'],
    ],
  },
  { module: 'parts', label: 'Spare parts', actions: [['view', 'View part requests and stock'], ['approve', 'Approve part requests']] },
  { module: 'sla', label: 'SLA', actions: [['view', 'View SLA'], ['edit', 'Configure SLA']] },
  { module: 'escalations', label: 'Escalations', actions: [['view', 'View escalations'], ['manage', 'Raise, assign and resolve escalations']] },
  { module: 'rates', label: 'Call rates & charges', actions: [['view', 'View call rates'], ['edit', 'Edit call rates']] },
  {
    module: 'billing',
    label: 'Billing & invoices',
    actions: [['view', 'View billing and invoices'], ['edit', 'Raise and update invoices'], ['export', 'Export billing']],
  },
  { module: 'payments', label: 'Payments', actions: [['view', 'View payments and dues']] },
  { module: 'reports', label: 'Reports', actions: [['view', 'View reports'], ['export', 'Export reports']] },
  { module: 'users', label: 'Users', actions: [['view', 'View users, roles and teams'], ['edit', 'Invite and edit users']] },
  { module: 'roles', label: 'Roles', actions: [['manage', 'Create and edit roles']] },
  { module: 'teams', label: 'Teams & departments', actions: [['edit', 'Create and edit teams']] },
  { module: 'settings', label: 'Settings', actions: [['view', 'View brand settings'], ['edit', 'Edit brand settings']] },
  { module: 'audit', label: 'Audit log', actions: [['view', 'View the audit log']] },
  { module: 'catalog', label: 'Catalog', actions: [['view', 'View sub-brands and products'], ['edit', 'Edit sub-brands and products']] },
  {
    module: 'operations',
    label: 'Operations',
    actions: [['view', 'Service network, completions, AMC, replacements, returns, documents'], ['edit', 'Act on replacements, returns, documents, AMC']],
  },
  { module: 'engagement', label: 'Engagement', actions: [['view', 'Reviews and academy'], ['edit', 'Respond to reviews, publish academy content']] },
  { module: 'integrations', label: 'Integrations', actions: [['manage', 'CRM webhook and API keys']] },
];

export const BRAND_PERMISSION_CATALOG = Object.freeze(
  MODULES.map(({ module, label, actions }) => ({
    module,
    label,
    actions: actions.map(([action, description]) => ({ key: `${module}:${action}`, action, description })),
  })),
);

export const BRAND_PERMISSION_KEYS = Object.freeze(BRAND_PERMISSION_CATALOG.flatMap((m) => m.actions.map((a) => a.key)));

const ALL = '*';
/** Expands `{ tickets: ['view','create'], reports: ALL }` into keys. */
function grant(spec) {
  return Object.entries(spec).flatMap(([module, actions]) => {
    const entry = BRAND_PERMISSION_CATALOG.find((m) => m.module === module);
    if (!entry) throw new Error(`permissions.js: unknown module "${module}"`);
    const wanted = actions === ALL ? entry.actions.map((a) => a.action) : actions;
    return wanted.map((action) => {
      const key = `${module}:${action}`;
      if (!BRAND_PERMISSION_KEYS.includes(key)) throw new Error(`permissions.js: unknown permission "${key}"`);
      return key;
    });
  });
}

// What the client calls "everything read-only that isn't admin or money".
const READ_OPERATIONS = { catalog: ['view'], operations: ['view'], engagement: ['view'] };

export const SUPER_ADMIN_TEMPLATE = 'brand_super_admin';

/** The nine roles every brand starts with (§6.2). Brands may edit them afterwards. */
export const ROLE_TEMPLATES = Object.freeze([
  {
    template: SUPER_ADMIN_TEMPLATE,
    name: 'Brand Super Admin',
    permissions: [...BRAND_PERMISSION_KEYS],
  },
  {
    template: 'brand_manager',
    name: 'Brand Manager',
    permissions: grant({
      dashboard: ALL, tickets: ALL, customers: ALL, warranty: ['view', 'verify'], parts: ALL, sla: ALL, escalations: ALL,
      rates: ['view'], billing: ['view'], payments: ['view'], reports: ALL, users: ['view'], settings: ['view'], audit: ['view'],
      catalog: ALL, operations: ALL, engagement: ALL,
    }),
  },
  {
    template: 'cce',
    name: 'Customer Care Executive',
    permissions: grant({
      dashboard: ['view'], tickets: ['view', 'create', 'edit'], customers: ['view', 'create', 'edit'], warranty: ['view'],
      parts: ['view'], sla: ['view'], escalations: ['view'], ...READ_OPERATIONS,
    }),
  },
  {
    template: 'warranty_executive',
    name: 'Warranty Executive',
    permissions: grant({
      dashboard: ['view'], tickets: ['view', 'edit', 'approve'], customers: ['view'], warranty: ALL, parts: ['view'],
      sla: ['view'], escalations: ['view'], reports: ['view'], ...READ_OPERATIONS,
    }),
  },
  {
    template: 'service_operations',
    name: 'Service Operations',
    permissions: grant({
      dashboard: ['view'], tickets: ['view', 'edit', 'assign', 'priority'], customers: ['view'], warranty: ['view'], parts: ['view'],
      sla: ALL, escalations: ALL, reports: ['view'], catalog: ALL, operations: ALL, engagement: ALL,
    }),
  },
  {
    template: 'spare_parts',
    name: 'Spare Parts',
    permissions: grant({
      dashboard: ['view'], tickets: ['view'], warranty: ['view'], parts: ALL, sla: ['view'], escalations: ['view'],
      reports: ['view'], ...READ_OPERATIONS,
    }),
  },
  {
    template: 'finance',
    name: 'Finance',
    permissions: grant({
      dashboard: ['view'], tickets: ['view'], customers: ['view'], parts: ['view'], rates: ALL, billing: ALL, payments: ALL,
      reports: ALL, audit: ['view'],
    }),
  },
  {
    template: 'quality_escalation',
    name: 'Quality / Escalation',
    permissions: grant({
      dashboard: ['view'], tickets: ['view', 'edit', 'priority'], customers: ['view'], warranty: ['view'], parts: ['view'],
      sla: ALL, escalations: ALL, reports: ALL, audit: ['view'], ...READ_OPERATIONS,
    }),
  },
  {
    template: 'viewer',
    name: 'Viewer',
    permissions: grant({
      dashboard: ['view'], tickets: ['view'], customers: ['view'], warranty: ['view'], parts: ['view'], sla: ['view'],
      escalations: ['view'], reports: ['view'], ...READ_OPERATIONS,
    }),
  },
]);

export const BRAND_DEPARTMENTS = Object.freeze([
  'Management',
  'Customer Care',
  'Warranty',
  'Service Operations',
  'Spare Parts',
  'Finance',
  'Quality',
]);
