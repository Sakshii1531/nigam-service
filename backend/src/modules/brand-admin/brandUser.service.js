import { User } from '../auth/user.model.js';
import { Role } from '../auth/role.model.js';
import { hashPassword } from '../auth/password.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ROLES } from '../../config/constants.js';

// BrandUser (BACKEND_CONTEXT.md §5) folded into the shared User collection
// (role: 'brand_admin', brand: <this brand>) rather than a separate model — same
// Phase 1 deviation as everywhere else User covers multiple app roles.

export async function listBrandUsers(brandId) {
  return User.find({ role: ROLES.BRAND_ADMIN, brand: brandId }).populate('assignedRoles').sort({ createdAt: -1 });
}

async function findOwnedBrandUser(brandId, id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'Brand user not found');
  if (user.role !== ROLES.BRAND_ADMIN || String(user.brand) !== brandId) {
    throw new ApiError(403, 'Not authorized to access this brand user');
  }
  return user;
}

export async function getBrandUser(brandId, id) {
  const user = await findOwnedBrandUser(brandId, id);
  return user.populate('assignedRoles');
}

async function validateRolesBelongToBrand(brandId, roleIds = []) {
  if (roleIds.length === 0) return [];
  const roles = await Role.find({ _id: { $in: roleIds }, scope: 'brand', brand: brandId });
  if (roles.length !== roleIds.length) throw new ApiError(400, 'One or more roles do not belong to this brand');
  return roleIds;
}

/** No email-invite infra exists yet (same gap as OTP/SMS — BACKEND_CONTEXT.md §9),
 * so this creates the account directly with an admin-supplied initial password,
 * matching how scripts/seed.js creates every other role's account today. */
export async function inviteBrandUser(brandId, { name, email, phone, password, assignedRoles = [] }) {
  await validateRolesBelongToBrand(brandId, assignedRoles);
  const created = await User.create({
    role: ROLES.BRAND_ADMIN,
    name,
    email,
    phone,
    brand: brandId,
    assignedRoles,
    passwordHash: await hashPassword(password),
    status: 'Active',
  });
  // Re-fetch rather than return `created` directly — passwordHash's `select: false`
  // only applies to queries, not to the document a .create() call hands back, so
  // returning `created` as-is would leak the hash in the HTTP response.
  return User.findById(created._id).populate('assignedRoles');
}

export async function updateBrandUser(brandId, id, { name, phone, assignedRoles, status }) {
  const user = await findOwnedBrandUser(brandId, id);
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (status !== undefined) user.status = status;
  if (assignedRoles !== undefined) user.assignedRoles = await validateRolesBelongToBrand(brandId, assignedRoles);
  await user.save();
  return user.populate('assignedRoles');
}
