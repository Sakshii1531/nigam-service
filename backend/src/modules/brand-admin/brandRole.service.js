import mongoose from 'mongoose';
import { Role } from '../auth/role.model.js';
import { Permission } from '../auth/permission.model.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { recordAction } from '../shared/auditLog.js';
import { SUPER_ADMIN_TEMPLATE } from '../brand-crm/permissions.js';
import { ensureBrandRoleTemplates } from '../brand-crm/roleTemplates.service.js';
import { invalidateBrandPermissions } from '../brand-crm/brandPermission.middleware.js';

// Brand-scoped roles (User & Role Management). Same Role collection as the
// platform roles, disambiguated by scope + brand. Since docs/brand-crm Phase 2
// every brand has the nine template roles, and a role may only hold brand
// permission keys — a brand can never grant itself a platform permission.

export async function listRoles(brandId) {
  await ensureBrandRoleTemplates(brandId);
  const roles = await Role.find({ scope: 'brand', brand: brandId }).populate('permissions').sort({ name: 1 }).lean();
  const counts = await User.aggregate([
    { $match: { role: 'brand_admin', brand: new mongoose.Types.ObjectId(String(brandId)) } },
    { $unwind: '$assignedRoles' },
    { $group: { _id: '$assignedRoles', users: { $sum: 1 } } },
  ]);
  const byRole = new Map(counts.map((c) => [String(c._id), c.users]));
  return roles.map((r) => ({
    ...r,
    id: String(r._id),
    permissions: (r.permissions || []).map((p) => ({ id: String(p._id), key: p.key, description: p.description, domain: p.domain })),
    userCount: byRole.get(String(r._id)) || 0,
  }));
}

async function resolvePermissionIds(keys = []) {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return [];
  const permissions = await Permission.find({ key: { $in: unique }, scope: 'brand' });
  if (permissions.length !== unique.length) {
    const found = new Set(permissions.map((p) => p.key));
    const missing = unique.filter((k) => !found.has(k));
    throw new ApiError(400, `Unknown permission key(s): ${missing.join(', ')}`);
  }
  return permissions.map((p) => p._id);
}

async function keysOf(role) {
  const perms = await Permission.find({ _id: { $in: role.permissions } }).select('key').lean();
  return perms.map((p) => p.key).sort();
}

export async function createRole(brandId, { name, permissionKeys = [], icon, color }, actor) {
  await ensureBrandRoleTemplates(brandId);
  if (await Role.exists({ scope: 'brand', brand: brandId, name })) throw new ApiError(409, `A role named "${name}" already exists`);
  const permissions = await resolvePermissionIds(permissionKeys);
  const role = await Role.create({ name, scope: 'brand', brand: brandId, permissions, icon, color });
  await recordAction({
    brand: brandId, entityType: 'Role', entityId: role._id, action: 'role.created', actor,
    meta: { name, permissions: [...new Set(permissionKeys)].sort() },
  });
  return role.populate('permissions');
}

async function findOwnedRole(brandId, id) {
  const role = await Role.findById(id).catch(() => null);
  if (!role || role.scope !== 'brand' || String(role.brand) !== String(brandId)) throw new ApiError(404, 'Role not found');
  return role;
}

export async function updateRole(brandId, id, { name, permissionKeys, icon, color }, actor) {
  const role = await findOwnedRole(brandId, id);
  const changes = {};
  if (name !== undefined && name !== role.name) {
    if (await Role.exists({ scope: 'brand', brand: brandId, name, _id: { $ne: role._id } })) {
      throw new ApiError(409, `A role named "${name}" already exists`);
    }
    changes.name = [role.name, name];
    role.name = name;
  }
  if (icon !== undefined && icon !== role.icon) { changes.icon = [role.icon ?? null,icon]; role.icon = icon; }
  if (color !== undefined && color !== role.color) { changes.color = [role.color ?? null,color]; role.color = color; }
  if (permissionKeys !== undefined) {
    if (role.template === SUPER_ADMIN_TEMPLATE) {
      throw new ApiError(409, 'The Brand Super Admin role always has every permission');
    }
    const before = await keysOf(role);
    role.permissions = await resolvePermissionIds(permissionKeys);
    const after = [...new Set(permissionKeys)].sort();
    if (before.join() !== after.join()) changes.permissions = [before, after];
  }
  await role.save();
  invalidateBrandPermissions();
  if (Object.keys(changes).length) {
    await recordAction({
      brand: brandId, entityType: 'Role', entityId: role._id,
      action: changes.permissions ? 'role.permissions_changed' : 'role.updated', actor, meta: { changes },
    });
  }
  return role.populate('permissions');
}

export async function deleteRole(brandId, id, actor) {
  const role = await findOwnedRole(brandId, id);
  if (role.template === SUPER_ADMIN_TEMPLATE) throw new ApiError(409, 'The Brand Super Admin role cannot be deleted');
  const holders = await User.countDocuments({ role: 'brand_admin', brand: brandId, assignedRoles: role._id });
  if (holders) throw new ApiError(409, `This role is assigned to ${holders} user(s) — reassign them first`);
  await role.deleteOne();
  invalidateBrandPermissions();
  await recordAction({ brand: brandId, entityType: 'Role', entityId: role._id, action: 'role.deleted', actor, meta: { name: role.name } });
}
