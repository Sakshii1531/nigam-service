import { User } from '../auth/user.model.js';
import { RefreshToken } from '../auth/refreshToken.model.js';
import { Brand } from './brand.model.js';
import { hashPassword } from '../auth/password.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ROLES } from '../../config/constants.js';
import { ensureBrandRoleTemplates } from '../brand-crm/roleTemplates.service.js';
import { SUPER_ADMIN_TEMPLATE } from '../brand-crm/permissions.js';
import { invalidateBrandPermissions } from '../brand-crm/brandPermission.middleware.js';

async function findBrand(brandId) {
  const brand = await Brand.findById(brandId);
  if (!brand) throw new ApiError(404, 'Brand not found');
  return brand;
}

/** The administrator NCC creates for a brand is its owner: Brand Super Admin (docs/brand-crm D9). */
async function ensureBrandAdminRole(brandId) {
  const roles = await ensureBrandRoleTemplates(brandId);
  return roles[SUPER_ADMIN_TEMPLATE];
}

async function findAdmin(id) {
  const user = await User.findOne({ _id: id, role: ROLES.BRAND_ADMIN });
  if (!user) throw new ApiError(404, 'Brand administrator not found');
  return user;
}

export function listBrandAdmins({ brand, status } = {}) {
  const query = { role: ROLES.BRAND_ADMIN };
  if (brand) query.brand = brand;
  if (status) query.status = status;
  return User.find(query).populate('brand', 'name status').populate('assignedRoles', 'name').sort({ createdAt: -1 });
}

export async function getBrandAdmin(id) {
  await findAdmin(id);
  return User.findById(id).populate('brand', 'name status').populate('assignedRoles', 'name');
}

export async function createBrandAdmin({ name, email, phone, brand: brandId, temporaryPassword }) {
  await findBrand(brandId);
  const duplicate = await User.findOne({ role: ROLES.BRAND_ADMIN, $or: [{ email }, { phone }] });
  if (duplicate) throw new ApiError(409, 'A brand administrator already uses this email address or phone number');

  const role = await ensureBrandAdminRole(brandId);
  const user = await User.create({
    role: ROLES.BRAND_ADMIN,
    name,
    email,
    phone: phone || undefined,
    brand: brandId,
    assignedRoles: [role._id],
    passwordHash: await hashPassword(temporaryPassword),
    mustChangePassword: true,
    status: 'Active',
  });
  return getBrandAdmin(user.id);
}

export async function updateBrandAdmin(id, updates) {
  const user = await findAdmin(id);
  if (updates.email && updates.email !== user.email) {
    const duplicate = await User.findOne({ role: ROLES.BRAND_ADMIN, email: updates.email, _id: { $ne: user._id } });
    if (duplicate) throw new ApiError(409, 'A brand administrator already uses this email address');
  }
  if (updates.phone && updates.phone !== user.phone) {
    const duplicate = await User.findOne({ role: ROLES.BRAND_ADMIN, phone: updates.phone, _id: { $ne: user._id } });
    if (duplicate) throw new ApiError(409, 'A brand administrator already uses this phone number');
  }
  if (updates.brand && String(updates.brand) !== String(user.brand)) {
    await findBrand(updates.brand);
    const role = await ensureBrandAdminRole(updates.brand);
    user.brand = updates.brand;
    user.assignedRoles = [role._id];
  }
  for (const field of ['name', 'email', 'phone', 'status']) {
    if (updates[field] !== undefined) user[field] = updates[field] || undefined;
  }
  await user.save();
  invalidateBrandPermissions(user.id);
  if (updates.status === 'Suspended') {
    await RefreshToken.updateMany({ user: user._id, revoked: false }, { revoked: true });
  }
  return getBrandAdmin(user.id);
}

export async function resetTemporaryPassword(id, temporaryPassword) {
  const user = await findAdmin(id);
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  await user.save();
  await RefreshToken.updateMany({ user: user._id, revoked: false }, { revoked: true });
  return getBrandAdmin(user.id);
}
