import { Role } from '../auth/role.model.js';
import { Permission } from '../auth/permission.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Mirrors brand-admin/brandRole.service.js's shape, scope: 'platform' instead
// of 'brand' (Roles.jsx's platform-wide boolean permission matrix).

export async function listRoles() {
  return Role.find({ scope: 'platform' }).populate('permissions').sort({ name: 1 });
}

async function resolvePermissionIds(keys = []) {
  if (keys.length === 0) return [];
  const permissions = await Permission.find({ key: { $in: keys } });
  if (permissions.length !== keys.length) {
    const found = new Set(permissions.map((p) => p.key));
    const missing = keys.filter((k) => !found.has(k));
    throw new ApiError(400, `Unknown permission key(s): ${missing.join(', ')}`);
  }
  return permissions.map((p) => p._id);
}

export async function createRole({ name, permissionKeys = [], icon, color }) {
  const permissions = await resolvePermissionIds(permissionKeys);
  const role = await Role.create({ name, scope: 'platform', brand: null, permissions, icon, color });
  return role.populate('permissions');
}

async function findPlatformRole(id) {
  const role = await Role.findById(id);
  if (!role) throw new ApiError(404, 'Role not found');
  if (role.scope !== 'platform') throw new ApiError(403, 'Not a platform-scope role');
  return role;
}

export async function updateRole(id, { name, permissionKeys, icon, color }) {
  const role = await findPlatformRole(id);
  if (name !== undefined) role.name = name;
  if (icon !== undefined) role.icon = icon;
  if (color !== undefined) role.color = color;
  if (permissionKeys !== undefined) role.permissions = await resolvePermissionIds(permissionKeys);
  await role.save();
  return role.populate('permissions');
}

export async function deleteRole(id) {
  const role = await findPlatformRole(id);
  await role.deleteOne();
}

export async function listPermissions() {
  return Permission.find().sort({ domain: 1, key: 1 });
}
