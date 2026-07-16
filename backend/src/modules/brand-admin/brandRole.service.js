import { Role } from '../auth/role.model.js';
import { Permission } from '../auth/permission.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Brand-scoped Roles (UserRoleManagement.jsx: Brand Admin/Support Agent/Finance/
// Viewer with a finer permission list) — same Role collection Phase 3 seeded a
// platform-scoped 'Super Admin' role into, disambiguated by scope+brand.

export async function listRoles(brandId) {
  return Role.find({ scope: 'brand', brand: brandId }).populate('permissions').sort({ name: 1 });
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

export async function createRole(brandId, { name, permissionKeys = [], icon, color }) {
  const permissions = await resolvePermissionIds(permissionKeys);
  const role = await Role.create({ name, scope: 'brand', brand: brandId, permissions, icon, color });
  return role.populate('permissions');
}

async function findOwnedRole(brandId, id) {
  const role = await Role.findById(id);
  if (!role) throw new ApiError(404, 'Role not found');
  if (role.scope !== 'brand' || String(role.brand) !== brandId) throw new ApiError(403, 'Not authorized to access this role');
  return role;
}

export async function updateRole(brandId, id, { name, permissionKeys, icon, color }) {
  const role = await findOwnedRole(brandId, id);
  if (name !== undefined) role.name = name;
  if (icon !== undefined) role.icon = icon;
  if (color !== undefined) role.color = color;
  if (permissionKeys !== undefined) role.permissions = await resolvePermissionIds(permissionKeys);
  await role.save();
  return role.populate('permissions');
}

export async function deleteRole(brandId, id) {
  const role = await findOwnedRole(brandId, id);
  await role.deleteOne();
}
