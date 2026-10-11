import { User } from '../auth/user.model.js';
import { Role } from '../auth/role.model.js';
import { RefreshToken } from '../auth/refreshToken.model.js';
import { hashPassword } from '../auth/password.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ROLES } from '../../config/constants.js';
import { recordAction } from '../shared/auditLog.js';
import { SUPER_ADMIN_TEMPLATE } from '../brand-crm/permissions.js';
import { ensureBrandRoleTemplates } from '../brand-crm/roleTemplates.service.js';
import { invalidateBrandPermissions } from '../brand-crm/brandPermission.middleware.js';

// BrandUser (BACKEND_CONTEXT.md §5) folded into the shared User collection
// (role: 'brand_admin', brand: <this brand>) rather than a separate model — same
// Phase 1 deviation as everywhere else User covers multiple app roles.
//
// docs/brand-crm Phase 2 guard rails: nobody changes their own roles or
// status, and a brand always keeps at least one active Brand Super Admin.

const POPULATE_ROLES = { path: 'assignedRoles', select: 'name template' };

export async function listBrandUsers(brandId) {
  return User.find({ role: ROLES.BRAND_ADMIN, brand: brandId }).populate(POPULATE_ROLES).sort({ createdAt: -1 });
}

async function findOwnedBrandUser(brandId, id) {
  const user = await User.findById(id).catch(() => null);
  if (!user || user.role !== ROLES.BRAND_ADMIN || String(user.brand) !== String(brandId)) {
    throw new ApiError(404, 'Brand user not found');
  }
  return user;
}

export async function getBrandUser(brandId, id) {
  const user = await findOwnedBrandUser(brandId, id);
  return user.populate(POPULATE_ROLES);
}

async function validateRolesBelongToBrand(brandId, roleIds = []) {
  const unique = [...new Set(roleIds.map(String))];
  if (unique.length === 0) return [];
  const roles = await Role.find({ _id: { $in: unique }, scope: 'brand', brand: brandId }).select('_id').catch(() => []);
  if (roles.length !== unique.length) throw new ApiError(400, 'One or more roles do not belong to this brand');
  return unique;
}

async function assertEmployeeIdFree(brandId, employeeId, exceptId = null) {
  if (!employeeId) return;
  const taken = await User.exists({ role: ROLES.BRAND_ADMIN, brand: brandId, employeeId, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  if (taken) throw new ApiError(409, `Employee ID ${employeeId} is already used by another user`);
}

/** Active users holding the Brand Super Admin role, other than `exceptId`. */
async function otherActiveSuperAdmins(brandId, exceptId) {
  const roles = await ensureBrandRoleTemplates(brandId);
  return User.countDocuments({
    role: ROLES.BRAND_ADMIN,
    brand: brandId,
    status: 'Active',
    assignedRoles: roles[SUPER_ADMIN_TEMPLATE]._id,
    _id: { $ne: exceptId },
  });
}

const roleNames = async (ids) => (await Role.find({ _id: { $in: ids } }).select('name').lean()).map((r) => r.name).sort();

/** No email-invite infra exists yet (same gap as OTP/SMS — BACKEND_CONTEXT.md §9),
 * so this creates the account directly with an admin-supplied initial password,
 * matching how scripts/seed.js creates every other role's account today. */
export async function inviteBrandUser(brandId, { name, email, phone, password, assignedRoles = [], employeeId, department }, actor) {
  const roles = await validateRolesBelongToBrand(brandId, assignedRoles);
  await assertEmployeeIdFree(brandId, employeeId);
  const created = await User.create({
    role: ROLES.BRAND_ADMIN,
    name,
    email,
    phone,
    brand: brandId,
    assignedRoles: roles,
    employeeId: employeeId || undefined,
    department: department || undefined,
    passwordHash: await hashPassword(password),
    status: 'Active',
  });
  await recordAction({
    brand: brandId, entityType: 'User', entityId: created._id, action: 'user.created', actor,
    meta: { name, employeeId: employeeId || null, department: department || null, roles: await roleNames(roles) },
  });
  // Re-fetch rather than return `created` directly — passwordHash's `select: false`
  // only applies to queries, not to the document a .create() call hands back, so
  // returning `created` as-is would leak the hash in the HTTP response.
  return User.findById(created._id).populate(POPULATE_ROLES);
}

export async function updateBrandUser(brandId, id, { name, phone, assignedRoles, status, employeeId, department }, actor) {
  const user = await findOwnedBrandUser(brandId, id);
  const isSelf = actor?.user && String(actor.user) === String(user._id);
  const changes = {};
  const set = (field, value) => {
    if (value === undefined || String(value ?? '') === String(user[field] ?? '')) return;
    changes[field] = [user[field] ?? null, value];
    user[field] = value;
  };

  if (isSelf && assignedRoles !== undefined) throw new ApiError(403, 'You cannot change your own roles');
  if (isSelf && status !== undefined && status !== user.status) throw new ApiError(403, 'You cannot change your own status');

  if (employeeId !== undefined) await assertEmployeeIdFree(brandId, employeeId, user._id);

  const roles = await ensureBrandRoleTemplates(brandId);
  const superAdminId = String(roles[SUPER_ADMIN_TEMPLATE]._id);
  const wasActiveSuperAdmin = user.status === 'Active' && user.assignedRoles.map(String).includes(superAdminId);
  const nextRoles = assignedRoles !== undefined ? await validateRolesBelongToBrand(brandId, assignedRoles) : user.assignedRoles.map(String);
  const nextStatus = status ?? user.status;
  const staysActiveSuperAdmin = nextStatus === 'Active' && nextRoles.includes(superAdminId);
  if (wasActiveSuperAdmin && !staysActiveSuperAdmin && (await otherActiveSuperAdmins(brandId, user._id)) === 0) {
    throw new ApiError(409, 'A brand must keep at least one active Brand Super Admin');
  }

  set('name', name);
  set('phone', phone);
  set('employeeId', employeeId || undefined);
  set('department', department || undefined);
  set('status', status);
  if (assignedRoles !== undefined) {
    const before = await roleNames(user.assignedRoles);
    const after = await roleNames(nextRoles);
    if (before.join() !== after.join()) changes.roles = [before, after];
    user.assignedRoles = nextRoles;
  }
  await user.save();
  invalidateBrandPermissions(user._id);
  if (status === 'Suspended') await RefreshToken.updateMany({ user: user._id, revoked: false }, { revoked: true });

  if (Object.keys(changes).length) {
    const action = changes.roles ? 'user.roles_changed' : changes.status ? 'user.status_changed' : 'user.updated';
    await recordAction({ brand: brandId, entityType: 'User', entityId: user._id, action, actor, meta: { changes } });
  }
  if (changes.roles) await recordAction({brand:brandId,entityType:'User',entityId:user._id,action:'auth.roles_changed',actor,meta:{changes:{roles:changes.roles}}});
  if (changes.status && status === 'Suspended') await recordAction({brand:brandId,entityType:'User',entityId:user._id,action:'auth.suspended',actor,meta:{changes:{status:changes.status}}});
  return user.populate(POPULATE_ROLES);
}
