import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { WarrantyGroup } from '../src/modules/partner-warranty/warrantyGroup.model.js';
import { WarrantyIssue } from '../src/modules/partner-warranty/warrantyIssue.model.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { Team } from '../src/modules/brand-admin/team.model.js';
import { ROLE_TEMPLATES, BRAND_PERMISSION_KEYS, SUPER_ADMIN_TEMPLATE } from '../src/modules/brand-crm/permissions.js';
import { ensureBrandRoleTemplates, backfillRolelessBrandUsers } from '../src/modules/brand-crm/roleTemplates.service.js';
import { repairLegacyBrandAdmin } from '../scripts/repairLegacyBrandAdmin.js';
import { BRAND_ROUTE_RULES, ruleFor } from '../src/modules/brand-crm/brandAccess.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { brandCrmKit } from './helpers/brandCrm.js';

const TEST_DB_URI = testDbUri('brandCrmRbac');

let app;
let expressApp;
const kit = brandCrmKit(() => app, { phoneStart: 9320200000 });
const { api, bearer } = kit;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
  await registerAllModels();
  await ensureIndexes();
  expressApp = createApp();
  app = await listenOnLoopback(expressApp);
});

afterAll(async () => {
  await closeServer(app);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all(
    [Category, Brand, WarrantyGroup, WarrantyIssue, WarrantyClaim, ServiceRequest, User, Role, AuditLog, Notification, Team].map((m) => m.deleteMany({})),
  );
});

/** LG with its owner (Brand Super Admin) plus one user per template we need. */
async function staff(w, ...templates) {
  const out = { owner: await kit.brandUser(w.lg, { employeeId: 'LG-OWN-1', name: 'Owner', templates: [SUPER_ADMIN_TEMPLATE] }) };
  for (const t of templates) {
    out[t] = await kit.brandUser(w.lg, { employeeId: `LG-${t}`, name: `User ${t}`, templates: [t] });
  }
  return out;
}

const get = (u, path) => api().get(`/api/v1${path}`).set(bearer(u.token));
const send = (u, method, path, body = {}) => api()[method](`/api/v1${path}`).set(bearer(u.token)).send(body);

describe('Phase 2 — role templates', () => {
  it('gives every brand the nine templates, idempotently, matching the catalogue', async () => {
    const w = await kit.world();
    await ensureBrandRoleTemplates(w.lg._id);
    await ensureBrandRoleTemplates(w.lg._id);
    const roles = await Role.find({ scope: 'brand', brand: w.lg._id }).populate('permissions', 'key');
    expect(roles).toHaveLength(9);
    for (const t of ROLE_TEMPLATES) {
      const role = roles.find((r) => r.template === t.template);
      expect(role.name).toBe(t.name);
      expect(role.permissions.map((p) => p.key).sort()).toEqual([...t.permissions].sort());
    }
    expect(roles.find((r) => r.template === SUPER_ADMIN_TEMPLATE).permissions).toHaveLength(BRAND_PERMISSION_KEYS.length);
    expect(await Permission.countDocuments({ scope: 'brand' })).toBe(BRAND_PERMISSION_KEYS.length);
  });

  it('creates the templates when Super Admin adds a brand, and makes its first admin the owner', async () => {
    const admin = await kit.superAdmin();
    const created = await send(admin, 'post', '/super-admin/brands', { name: 'Voltas' }).expect(201);
    expect(await Role.countDocuments({ scope: 'brand', brand: created.body.data.id })).toBe(9);

    const ba = await send(admin, 'post', '/super-admin/brand-admins', {
      name: 'Voltas Owner', email: 'owner@voltas.test', phone: '9320299999', brand: created.body.data.id, temporaryPassword: 'Temp#12345',
    }).expect(201);
    const user = await User.findById(ba.body.data.id).populate('assignedRoles');
    expect(user.assignedRoles.map((r) => r.template)).toEqual([SUPER_ADMIN_TEMPLATE]);
  });

  it('a template is found by its key, so a renamed one is not recreated; a same-named custom role is adopted', async () => {
    const w = await kit.world();
    await Role.create({ name: 'Finance', scope: 'brand', brand: w.lg._id, permissions: [] });
    const roles = await ensureBrandRoleTemplates(w.lg._id);
    expect(roles.finance.name).toBe('Finance');
    expect(roles.finance.permissions.length).toBeGreaterThan(0);

    await Role.updateOne({ _id: roles.viewer._id }, { name: 'Auditor' });
    await ensureBrandRoleTemplates(w.lg._id);
    expect(await Role.countDocuments({ scope: 'brand', brand: w.lg._id })).toBe(9);
  });
});

describe('Phase 2 — every brand route is guarded', () => {
  /** [method, full path] of every route mounted under /api/v1/brand, read from Express itself. */
  function brandRoutes() {
    const mountOf = (layer) => layer.regexp.source
      .replace(/^\^/, '')
      .replace(/\\\/\?\(\?=\\\/\|\$\)$/i, '')
      .replace(/\\\//g, '/');
    const routes = [];
    for (const layer of expressApp._router.stack) {
      if (layer.name !== 'router' || !layer.handle?.stack) continue;
      const mount = mountOf(layer);
      if (!mount.startsWith('/api/v1/brand')) continue;
      for (const r of layer.handle.stack) {
        if (!r.route) continue;
        for (const method of Object.keys(r.route.methods)) {
          routes.push([method.toUpperCase(), `${mount}${r.route.path === '/' ? '' : r.route.path}`]);
        }
      }
    }
    return routes;
  }

  it('has a permission rule for every route, and no rule without a route', () => {
    const routes = brandRoutes();
    expect(routes.length).toBeGreaterThan(80); // sanity: the walk really found the brand routers
    const unguarded = routes.filter(([m, p]) => !ruleFor(m, p.replace('/api/v1/brand', '') || '/'));
    expect(unguarded).toEqual([]);

    const unused = BRAND_ROUTE_RULES.filter(([m, path]) =>
      !routes.some(([rm, rp]) => rm === m && ruleFor(m, rp.replace('/api/v1/brand', ''))?.path === path));
    expect(unused).toEqual([]);
  });

  it('refuses a brand route that has no rule (deny by default)', async () => {
    const w = await kit.world();
    const { owner } = await staff(w);
    await get(owner, '/brand/not-a-real-endpoint').expect(403);
  });
});

describe('Phase 2 — what each role can reach', () => {
  it('a CCE works tickets but cannot reach finance, pricing, users or settings', async () => {
    const w = await kit.world();
    const s = await staff(w, 'cce');
    await get(s.cce, '/brand/warranty-claims').expect(200);
    await get(s.cce, '/brand/customers').expect(200);
    await get(s.cce, '/brand/settings').expect(200); // read-only, for the sidebar's support number

    const denied = [
      ['post', '/brand/rates', { category: 'AC', serviceType: 'repair', brandRate: 400 }],
      ['get', '/brand/rates'],
      ['get', '/brand/billing/invoices'],
      ['get', '/brand/billing/payments'],
      ['get', '/brand/users'],
      ['post', '/brand/roles', { name: 'X' }],
      ['put', '/brand/settings', { website: 'x' }],
      ['get', '/brand/warranty-webhook'],
      ['put', '/brand/warranty-coverage', {}],
      ['get', '/brand/permissions/catalog'],
    ];
    for (const [method, path, body] of denied) {
        const res = await send(s.cce, method, path, body).expect(403);
      expect(res.body.error.message).toMatch(/^Missing permission: /);
    }
  });

  it('only users with tickets:approve can decide a ticket', async () => {
    const w = await kit.world();
    const s = await staff(w, 'cce', 'warranty_executive');
    const ticket = await kit.createTicketAs(s.cce, kit.ticketInput(w, await kit.customer()));

    await send(s.cce, 'post', `/brand/warranty-claims/${ticket._id}/reject`, { rejectionCode:'PHYSICAL_DAMAGE',reason: 'Physical damage seen' }).expect(403);
    const res = await send(s.warranty_executive, 'post', `/brand/warranty-claims/${ticket._id}/reject`, { rejectionCode:'PHYSICAL_DAMAGE',reason: 'Physical damage seen' }).expect(200);
    const event = res.body.data.timeline.find((e) => e.action === 'CLAIM_REJECTED');
    expect(event.by).toEqual({ kind: 'brand', name: 'User warranty_executive', employeeId: 'LG-warranty_executive' });
  });

  it('finance reaches money, not tickets decisions or users', async () => {
    const w = await kit.world();
    const s = await staff(w, 'finance');
    await get(s.finance, '/brand/billing/invoices').expect(200);
    await get(s.finance, '/brand/billing/payments').expect(200);
    await get(s.finance, '/brand/rates').expect(200);
    await get(s.finance, '/brand/users').expect(403);
    await get(s.finance, '/reviews/brand').expect(403);
    await get(s.finance, '/exchange/requests/brand').expect(403);
  });

  it('guards the brand side of shared routes, leaving other roles alone', async () => {
    const w = await kit.world();
    const s = await staff(w, 'viewer');
    await get(s.viewer, '/service-requests').expect(200);
    await send(s.viewer, 'patch', `/service-requests/${new mongoose.Types.ObjectId()}/status`, { status: 'Closed' }).expect(403);
    const cust = await kit.customer();
    await get(cust, '/service-requests').expect(200);
  });

  it('a brand user with no roles reaches nothing, and a suspended one is signed out', async () => {
    const w = await kit.world();
    const nobody = await kit.brandUser(w.lg, { employeeId: 'LG-0' });
    await get(nobody, '/brand/dashboard').expect(403);
    await get(nobody, '/brand/settings').expect(200);

    const s = await staff(w, 'cce');
    await User.updateOne({ _id: s.cce.user._id }, { status: 'Suspended' });
    // A status change made directly in the DB is picked up when the cache expires;
    // through the API it is immediate (next test).
    const { invalidateBrandPermissions } = await import('../src/modules/brand-crm/brandPermission.middleware.js');
    invalidateBrandPermissions(s.cce.user._id);
    await get(s.cce, '/brand/warranty-claims').expect(401);
  });
});

describe('Phase 2 — changes take effect at once', () => {
  it('a role removed through the API stops working on the next request', async () => {
    const w = await kit.world();
    const s = await staff(w, 'finance');
    await get(s.finance, '/brand/billing/invoices').expect(200);

    const roles = await ensureBrandRoleTemplates(w.lg._id);
    await send(s.owner, 'put', `/brand/users/${s.finance.user._id}`, { assignedRoles: [String(roles.viewer._id)] }).expect(200);
    await get(s.finance, '/brand/billing/invoices').expect(403);
  });

  it('editing a role\'s permissions applies to everyone holding it', async () => {
    const w = await kit.world();
    const s = await staff(w, 'viewer');
    await get(s.viewer, '/brand/billing/invoices').expect(403);
    const roles = await ensureBrandRoleTemplates(w.lg._id);
    await send(s.owner, 'put', `/brand/roles/${roles.viewer._id}`, { permissionKeys: ['dashboard:view', 'billing:view'] }).expect(200);
    await get(s.viewer, '/brand/billing/invoices').expect(200);
    await get(s.viewer, '/brand/warranty-claims').expect(403);
  });

  it('/auth/me reports the permissions the server enforces', async () => {
    const w = await kit.world();
    const s = await staff(w, 'cce');
    const me = await get(s.cce, '/auth/me').expect(200);
    const cce = ROLE_TEMPLATES.find((t) => t.template === 'cce');
    expect(me.body.data.permissions.sort()).toEqual([...cce.permissions].sort());
    expect(me.body.data.brandRoles).toEqual([expect.objectContaining({ name: 'Customer Care Executive', template: 'cce' })]);
  });
});

describe('Phase 2 — guard rails', () => {
  it('rejects duplicate brand-user phones and emails with clear conflicts without changing the existing account', async () => {
    const w = await kit.world();
    const { owner } = await staff(w);
    const body = { name: 'New Staff', phone: '1234567890', email: 'unique-staff@lg.test', password: 'password123' };
    const created = await send(owner, 'post', '/brand/users', body).expect(201);
    const phoneConflict = await send(owner, 'post', '/brand/users', { ...body, email: 'other-staff@lg.test' }).expect(409);
    expect(phoneConflict.body.error.message).toContain('phone number');
    expect(phoneConflict.body.error.message).toContain("existing user's roles");
    expect(phoneConflict.body.error.message).not.toContain('E11000');
    const emailConflict = await send(owner, 'post', '/brand/users', { ...body, phone: '1234567891', email: ' UNIQUE-STAFF@LG.TEST ' }).expect(409);
    expect(emailConflict.body.error.message).toContain('email address');
    expect(await User.countDocuments({ role: 'brand_admin', phone: body.phone })).toBe(1);
    expect((await User.findById(created.body.data.id)).name).toBe(body.name);
    expect(await AuditLog.countDocuments({ entityId: created.body.data.id, action: 'user.created' })).toBe(1);
  });

  it('checks phone uniqueness across brands, preserves update data, and allows retaining your own number', async () => {
    const w = await kit.world();
    const { owner } = await staff(w);
    const other = await kit.brandUser(w.samsung, { employeeId: 'S-DUPLICATE-PHONE', templates: ['viewer'] });
    other.user.phone = '1234567894';
    await other.user.save();
    await User.updateOne({ _id: owner.user._id }, { phone: '1234567893' });
    const before = await User.findById(owner.user._id);
    await send(owner, 'post', '/brand/users', { name: 'Duplicate', phone: other.user.phone, password: 'password123' }).expect(409);
    const conflict = await send(owner, 'put', `/brand/users/${owner.user._id}`, { name: 'Should not save', phone: other.user.phone }).expect(409);
    expect(conflict.body.error.message).not.toContain('E11000');
    expect((await User.findById(owner.user._id)).name).toBe(before.name);
    await send(owner, 'put', `/brand/users/${owner.user._id}`, { phone: before.phone }).expect(200);
  });

  it('handles simultaneous creations with the same phone as a conflict, not a database error', async () => {
    const w = await kit.world();
    const { owner } = await staff(w);
    const responses = await Promise.all(['a', 'b'].map(suffix => send(owner, 'post', '/brand/users', {
      name: `Concurrent ${suffix}`, email: `concurrent-${suffix}@lg.test`, phone: '1234567892', password: 'password123',
    })));
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    const conflict = responses.find(response => response.status === 409);
    expect(conflict.body.error.message).toContain('phone number');
    expect(conflict.body.error.message).not.toMatch(/E11000|nigam|index:/);
    expect(await User.countDocuments({ role: 'brand_admin', phone: '1234567892' })).toBe(1);
  });

  it('nobody changes their own roles or status', async () => {
    const w = await kit.world();
    const s = await staff(w);
    const roles = await ensureBrandRoleTemplates(w.lg._id);
    await send(s.owner, 'put', `/brand/users/${s.owner.user._id}`, { assignedRoles: [String(roles.viewer._id)] }).expect(403);
    await send(s.owner, 'put', `/brand/users/${s.owner.user._id}`, { status: 'Suspended' }).expect(403);
    await send(s.owner, 'put', `/brand/users/${s.owner.user._id}`, { name: 'Owner Renamed', employeeId: 'LG-OWN-9' }).expect(200);
  });

  it('a brand always keeps one active Brand Super Admin', async () => {
    const w = await kit.world();
    const s = await staff(w);
    const roles = await ensureBrandRoleTemplates(w.lg._id);
    const hr = await send(s.owner, 'post', '/brand/roles', { name: 'HR', permissionKeys: ['users:view', 'users:edit'] }).expect(201);
    const hrUser = await kit.brandUser(w.lg, { employeeId: 'LG-HR' });
    await User.updateOne({ _id: hrUser.user._id }, { assignedRoles: [hr.body.data.id] });

    await send(hrUser, 'put', `/brand/users/${s.owner.user._id}`, { assignedRoles: [String(roles.viewer._id)] }).expect(409);
    await send(hrUser, 'put', `/brand/users/${s.owner.user._id}`, { status: 'Suspended' }).expect(409);

    const second = await kit.brandUser(w.lg, { employeeId: 'LG-OWN-2', templates: [SUPER_ADMIN_TEMPLATE] });
    await send(hrUser, 'put', `/brand/users/${s.owner.user._id}`, { status: 'Suspended' }).expect(200);
    await send(hrUser, 'put', `/brand/users/${second.user._id}`, { status: 'Suspended' }).expect(409);
  });

  it('protects the Super Admin role and roles still in use', async () => {
    const w = await kit.world();
    const s = await staff(w, 'viewer');
    const roles = await ensureBrandRoleTemplates(w.lg._id);
    await send(s.owner, 'put', `/brand/roles/${roles[SUPER_ADMIN_TEMPLATE]._id}`, { permissionKeys: ['dashboard:view'] }).expect(409);
    await send(s.owner, 'put', `/brand/roles/${roles[SUPER_ADMIN_TEMPLATE]._id}`, { name: 'Owner' }).expect(200);
    await send(s.owner, 'delete', `/brand/roles/${roles[SUPER_ADMIN_TEMPLATE]._id}`).expect(409);
    await send(s.owner, 'delete', `/brand/roles/${roles.viewer._id}`).expect(409);
    await send(s.owner, 'delete', `/brand/roles/${roles.finance._id}`).expect(200);
  });

  it('a brand can only grant brand permissions, and employee IDs are unique per brand', async () => {
    const w = await kit.world();
    const s = await staff(w);
    await Permission.updateOne({ key: 'techs:manage' }, { key: 'techs:manage', scope: 'platform' }, { upsert: true });
    await send(s.owner, 'post', '/brand/roles', { name: 'Sneaky', permissionKeys: ['techs:manage'] }).expect(400);

    await send(s.owner, 'post', '/brand/users', { name: 'A', email: 'a@lg.test', password: 'password123', employeeId: 'LG-77' }).expect(201);
    await send(s.owner, 'post', '/brand/users', { name: 'B', email: 'b@lg.test', password: 'password123', employeeId: 'LG-77' }).expect(409);
  });

  it('another brand\'s users, roles and teams read as missing', async () => {
    const w = await kit.world();
    const s = await staff(w);
    const samsungOwner = await kit.brandUser(w.samsung, { employeeId: 'S-1', templates: [SUPER_ADMIN_TEMPLATE] });
    const samsungRoles = await ensureBrandRoleTemplates(w.samsung._id);
    await send(s.owner, 'put', `/brand/users/${samsungOwner.user._id}`, { name: 'Hijack' }).expect(404);
    await send(s.owner, 'put', `/brand/roles/${samsungRoles.viewer._id}`, { name: 'Hijack' }).expect(404);
    await send(s.owner, 'post', '/brand/users', {
      name: 'X', email: 'x@lg.test', password: 'password123', assignedRoles: [String(samsungRoles.viewer._id)],
    }).expect(400);
  });
});

describe('Phase 2 — audit and departments', () => {
  it('records role, user and team changes with the actor and a diff', async () => {
    const w = await kit.world();
    const s = await staff(w, 'viewer');
    const roles = await ensureBrandRoleTemplates(w.lg._id);
    await send(s.owner, 'put', `/brand/roles/${roles.viewer._id}`, { permissionKeys: ['dashboard:view'] }).expect(200);
    await send(s.owner, 'put', `/brand/users/${s.viewer.user._id}`, { assignedRoles: [String(roles.finance._id)], department: 'Finance' }).expect(200);
    const team = await send(s.owner, 'post', '/brand/teams', { name: 'Accounts', department: 'Finance' }).expect(201);
    await send(s.owner, 'post', `/brand/teams/${team.body.data.id}/members`, { userId: String(s.viewer.user._id) }).expect(200);

    const rows = await AuditLog.find({ brand: w.lg._id, entityType: { $in: ['Role', 'User', 'Team'] } }).sort({ createdAt: 1 }).lean();
    expect(rows.map((r) => r.action)).toEqual(['role.permissions_changed', 'user.roles_changed', 'auth.roles_changed', 'team.created', 'team.member_added']);
    for (const r of rows) expect(r.actor).toMatchObject({ employeeId: 'LG-OWN-1', roles: ['Brand Super Admin'] });
    expect(rows[1].meta.changes.roles).toEqual([['Viewer'], ['Finance']]);
    expect(rows[1].meta.changes.department).toEqual([null, 'Finance']);
  });

  it('serves the permission catalogue with the templates', async () => {
    const w = await kit.world();
    const s = await staff(w);
    const res = await get(s.owner, '/brand/permissions/catalog').expect(200);
    expect(res.body.data.modules.find((m) => m.module === 'tickets').actions.map((a) => a.key)).toContain('tickets:approve');
    expect(res.body.data.templates).toHaveLength(9);
  });
});

describe('Phase 2 — existing accounts keep working', () => {
  it('targeted legacy-owner repair previews, audits, is idempotent and refuses restricted or roleless staff', async () => {
    const w = await kit.world();
    const legacy = await Role.create({ name: 'Brand Admin', scope: 'brand', brand: w.lg._id, permissions: [] });
    const old = await kit.brandUser(w.lg, { employeeId: 'LG-LEGACY' });
    await User.updateOne({ _id: old.user._id }, { assignedRoles: [legacy._id] });
    const cce = await kit.brandUser(w.lg, { employeeId: 'LG-CCE-REPAIR', templates: ['cce'] });
    const roleless = await kit.brandUser(w.lg, { employeeId: 'LG-INTENTIONALLY-EMPTY' });
    const options = { email: old.user.email, brandId: w.lg._id };
    expect(await repairLegacyBrandAdmin(options)).toMatchObject({ applied: false, effectivePermissionCount: 0 });
    expect((await User.findById(old.user._id)).assignedRoles.map(String)).toEqual([legacy.id]);
    for (const user of [cce, roleless]) await expect(repairLegacyBrandAdmin({ email: user.user.email, brandId: w.lg._id, apply: true })).rejects.toThrow('Not a legacy owner');
    await expect(repairLegacyBrandAdmin({ ...options, brandId: w.samsung._id, apply: true })).rejects.toThrow('No active Brand Admin');
    expect(await repairLegacyBrandAdmin({ ...options, apply: true })).toMatchObject({ applied: true, alreadyOwner: false });
    await get(old, '/brand/billing/invoices').expect(200);
    await get(cce, '/brand/billing/invoices').expect(403);
    expect(await repairLegacyBrandAdmin({ ...options, apply: true })).toMatchObject({ applied: true, alreadyOwner: true });
    expect(await AuditLog.countDocuments({ entityId: old.user._id, action: 'auth.roles_changed', reason: 'Restore pre-CRM owner access after verified legacy permission migration' })).toBe(1);
  });
  it('the backfill gives Brand Super Admin to users whose roles grant nothing, and only to them', async () => {
    const w = await kit.world();
    const legacy = await Role.create({ name: 'Brand Admin', scope: 'brand', brand: w.lg._id, permissions: [] });
    const old = await kit.brandUser(w.lg, { employeeId: 'LG-OLD' });
    await User.updateOne({ _id: old.user._id }, { assignedRoles: [legacy._id] });
    const cce = await kit.brandUser(w.lg, { employeeId: 'LG-CCE', templates: ['cce'] });

    await get(old, '/brand/billing/invoices').expect(403);
    expect(await backfillRolelessBrandUsers(w.lg._id)).toBe(1);
    await get(old, '/brand/billing/invoices').expect(200);
    await get(cce, '/brand/billing/invoices').expect(403);
    expect(await backfillRolelessBrandUsers(w.lg._id)).toBe(0);
  });
});
