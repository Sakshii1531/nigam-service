import { Permission } from '../auth/permission.model.js';
import { Role } from '../auth/role.model.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { BRAND_PERMISSION_CATALOG, BRAND_PERMISSION_KEYS, ROLE_TEMPLATES, SUPER_ADMIN_TEMPLATE } from './permissions.js';
import { invalidateBrandPermissions } from './brandPermission.middleware.js';

// Gives every brand the nine template roles of docs/brand-crm §6.2 and keeps
// the brand permission keys in the Permission collection. Idempotent: safe on
// every brand create, in the seed, and from tests.

/** Upserts the brand permission keys (scope 'brand'). Returns { key → _id }. */
export async function ensureBrandPermissions() {
  const existing = await Permission.find({ key: { $in: BRAND_PERMISSION_KEYS } }).select('key scope').lean();
  if (existing.length !== BRAND_PERMISSION_KEYS.length || existing.some((p) => p.scope !== 'brand')) {
    await Permission.bulkWrite(
      BRAND_PERMISSION_CATALOG.flatMap((m) =>
        m.actions.map((a) => ({
          updateOne: {
            filter: { key: a.key },
            update: { $set: { key: a.key, description: a.description, domain: m.module, scope: 'brand' } },
            upsert: true,
          },
        })),
      ),
    );
  }
  const docs = await Permission.find({ key: { $in: BRAND_PERMISSION_KEYS } }).select('key').lean();
  return Object.fromEntries(docs.map((p) => [p.key, p._id]));
}

/**
 * Makes sure the brand has a role for every template. A template role is found
 * by its template key, so a brand that renamed "Viewer" to "Auditor" keeps it.
 * A brand's own role that already uses a template's name is adopted as that
 * template rather than duplicated. Returns { template → Role }.
 */
export async function ensureBrandRoleTemplates(brandId) {
  const permIds = await ensureBrandPermissions();
  const roles = await Role.find({ scope: 'brand', brand: brandId });
  const result = {};
  for (const t of ROLE_TEMPLATES) {
    let role = roles.find((r) => r.template === t.template) || roles.find((r) => r.name === t.name && !r.template);
    if (!role) {
      role = await Role.create({ name: t.name, scope: 'brand', brand: brandId, template: t.template, permissions: t.permissions.map((k) => permIds[k]) });
    } else if (!role.template) {
      role.template = t.template;
      if (!role.permissions?.length) role.permissions = t.permissions.map((k) => permIds[k]);
      await role.save();
    }
    result[t.template] = role;
  }
  // Brand Super Admin always holds every brand permission, including ones
  // added to the catalogue after the role was created.
  const superAdmin = result[SUPER_ADMIN_TEMPLATE];
  const all = BRAND_PERMISSION_KEYS.map((k) => String(permIds[k]));
  if (all.some((id) => !superAdmin.permissions.map(String).includes(id))) {
    superAdmin.permissions = all;
    await superAdmin.save();
    invalidateBrandPermissions();
  }
  return result;
}

/** Adds a template role to a brand user (keeps the roles they already have). */
export async function assignTemplateRole(userId, brandId, template = SUPER_ADMIN_TEMPLATE) {
  const roles = await ensureBrandRoleTemplates(brandId);
  const role = roles[template];
  if (!role) throw new ApiError(400, `Unknown role template "${template}"`);
  await User.updateOne({ _id: userId }, { $addToSet: { assignedRoles: role._id } });
  invalidateBrandPermissions(userId);
  return role;
}

/**
 * Brand users whose brand roles grant nothing — no role, or only the old
 * empty "Brand Admin" role — get Brand Super Admin. Before
 * permissions were enforced (docs/brand-crm Phase 2) every brand user could do
 * everything, so this keeps existing accounts working; new users are always
 * given roles explicitly. Returns how many users were updated.
 */
export async function backfillRolelessBrandUsers(brandId) {
  const roles = await ensureBrandRoleTemplates(brandId);
  // Only brand-scope keys grant anything in the panel; an old role holding
  // platform keys (requests:manage …) counts as empty.
  const brandPermIds = Object.values(await ensureBrandPermissions());
  const grantingRoleIds = (await Role.find({ scope: 'brand', brand: brandId, permissions: { $in: brandPermIds } }).select('_id').lean())
    .map((r) => r._id);
  const res = await User.updateMany(
    { role: 'brand_admin', brand: brandId, assignedRoles: { $nin: grantingRoleIds } },
    { $addToSet: { assignedRoles: roles[SUPER_ADMIN_TEMPLATE]._id } },
  );
  invalidateBrandPermissions();
  return res.modifiedCount;
}
