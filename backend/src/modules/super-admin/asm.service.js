import { ASM } from './asm.model.js';
import { User } from '../auth/user.model.js';
import { Role } from '../auth/role.model.js';
import { Permission } from '../auth/permission.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { hashPassword } from '../auth/password.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ROLES } from '../../config/constants.js';

// TODO(zone-based ASM): once verification/status actions are wired through
// adminServiceProvider for ROLES.ASM (city-scoped), consider an
// activeJobs-style workload rollup here too, derived the same way
// findAsmForCity resolves who owns a given service provider.
export async function listAsms({ city } = {}) {
  const query = {};
  if (city) query.city = city;
  const asms = await ASM.find(query).populate('city', 'name').sort({ name: 1 });
  return Promise.all(asms.map(attachPermissions));
}

async function findOr404(id) {
  const asm = await ASM.findById(id).populate('city', 'name');
  if (!asm) throw new ApiError(404, 'ASM not found');
  return asm;
}

export async function getAsm(id) {
  return attachPermissions(await findOr404(id));
}

/**
 * The zone <-> ASM relationship is 1:1 (ASM.city is unique) and never stored
 * on ServiceProvider — "which ASM owns this provider" is always this lookup,
 * so reassigning a city's ASM moves every provider in it instantly, with
 * nothing to migrate.
 */
export async function findAsmForCity(cityId) {
  if (!cityId) return null;
  return ASM.findOne({ city: cityId });
}

/**
 * Resolves the ASM profile for a logged-in ASM user (req.user.id from the
 * JWT), the same way ServiceProvider routes resolve their own profile —
 * needed to scope every list/get/status call to just their own zone.
 */
export async function getAsmByUserId(userId) {
  const asm = await ASM.findOne({ user: userId }).populate('city', 'name');
  if (!asm) throw new ApiError(404, 'ASM profile not found for this account');
  return attachPermissions(asm);
}

/**
 * An ASM's permission checkboxes (super-admin console) are backed by the
 * same platform-scope Role/Permission RBAC brand-admin already uses, not a
 * bespoke ASM-only mechanism — one dedicated Role per ASM ("ASM — <name>"),
 * holding exactly the keys checked for that individual, assigned as their
 * sole assignedRoles entry. Resolving "what can this ASM do" is then just
 * the normal auth.service.js resolvePermissions() path every other role uses.
 */
async function syncAsmRole(userId, name, permissionKeys = []) {
  const validKeys = permissionKeys.filter((k) => typeof k === 'string' && k.trim());
  const permissionDocs = validKeys.length ? await Permission.find({ key: { $in: validKeys } }) : [];
  const roleName = `ASM — ${name}`;

  const user = await User.findById(userId).populate('assignedRoles');
  const existingRole = user.assignedRoles.find((r) => r.scope === 'platform' && r.name.startsWith('ASM — '));

  if (existingRole) {
    existingRole.name = roleName;
    existingRole.permissions = permissionDocs.map((p) => p._id);
    await existingRole.save();
  } else {
    const role = await Role.create({
      name: roleName,
      scope: 'platform',
      permissions: permissionDocs.map((p) => p._id),
    });
    user.assignedRoles = [...user.assignedRoles.map((r) => r._id), role._id];
    await user.save();
  }
}

async function attachPermissions(asmDoc) {
  const obj = asmDoc.toJSON();
  // Same derived relationship as findAsmForCity, the other direction: how
  // many providers currently fall under this zone. Powers the detail page's
  // "N service providers" stat without a separate round-trip.
  const cityId = asmDoc.city?._id || asmDoc.city;
  const serviceProviderCount = cityId ? await ServiceProvider.countDocuments({ city: cityId }) : 0;
  if (!asmDoc.user) return { ...obj, permissions: [], serviceProviderCount };
  const user = await User.findById(asmDoc.user).populate({ path: 'assignedRoles', populate: { path: 'permissions', select: 'key' } });
  const permissions = user ? [...new Set(user.assignedRoles.flatMap((r) => r.permissions.map((p) => p.key)))] : [];
  return { ...obj, permissions, serviceProviderCount };
}

/**
 * Creates the ASM profile and its login (User role: ASM) together. The
 * password set here is explicitly temporary — mustChangePassword forces a
 * real password of the ASM's own choosing on first login (see auth.service.js's
 * changePassword and asm/ChangePassword.jsx) before they reach anything else.
 * There is no separate "invite" flow in this app (OTP delivery itself is just
 * a console-logged stub outside a real SMS provider), so the super-admin
 * hands over this temporary credential directly.
 */
export async function createAsm({ name, email, phone, city, rating, password, permissions }) {
  if (!password || password.length < 6) {
    throw new ApiError(400, 'A temporary password of at least 6 characters is required to create the ASM\'s login');
  }
  const existingAsm = await ASM.findOne({ city });
  if (existingAsm) {
    throw new ApiError(409, `This zone already has an ASM (${existingAsm.name}) — reassign or remove them first`);
  }

  const user = await User.create({
    role: ROLES.ASM,
    name,
    email: email || undefined,
    phone: phone || undefined,
    passwordHash: await hashPassword(password),
    status: 'Active',
    mustChangePassword: true,
  });

  let asm;
  try {
    asm = await ASM.create({ name, email, phone, city, rating, user: user._id });
  } catch (err) {
    // Keep the two documents consistent — an ASM profile that failed to
    // create (e.g. the unique-city race) must not leave an orphaned login.
    await User.findByIdAndDelete(user._id);
    throw err;
  }

  await syncAsmRole(user._id, name, permissions);
  return getAsm(asm.id);
}

const EDITABLE_FIELDS = ['name', 'email', 'phone', 'city', 'rating'];

export async function updateAsm(id, updates) {
  const asm = await findOr404(id);
  if (updates.city && String(updates.city) !== String(asm.city?._id || asm.city)) {
    const existingAsm = await ASM.findOne({ city: updates.city });
    if (existingAsm) {
      throw new ApiError(409, `This zone already has an ASM (${existingAsm.name}) — reassign or remove them first`);
    }
  }
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) asm[field] = updates[field];
  }
  await asm.save();

  // Keep the linked login's own name/contact fields in step — the ASM signs
  // in with these, so a stale copy on User would let them keep using an
  // email/phone the super-admin just changed on their profile. The ASM
  // itself has no self-service edit path for phone/email at all — only this
  // one, super-admin-only, ever touches them.
  if (asm.user && (updates.name !== undefined || updates.email !== undefined || updates.phone !== undefined)) {
    const userUpdates = {};
    if (updates.name !== undefined) userUpdates.name = updates.name;
    if (updates.email !== undefined) userUpdates.email = updates.email || undefined;
    if (updates.phone !== undefined) userUpdates.phone = updates.phone || undefined;
    await User.findByIdAndUpdate(asm.user, userUpdates);
  }
  if (updates.password) {
    if (updates.password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
    // A super-admin-issued replacement is just as temporary as the original
    // one — force the same first-login change rather than letting a
    // password only the super-admin has typed persist indefinitely.
    await User.findByIdAndUpdate(asm.user, { passwordHash: await hashPassword(updates.password), mustChangePassword: true });
  }
  if (updates.permissions !== undefined && asm.user) {
    await syncAsmRole(asm.user, updates.name ?? asm.name, updates.permissions);
  }

  return getAsm(asm.id);
}

export async function deleteAsm(id) {
  const asm = await findOr404(id);

  // No reassignment needed: a zone with no ASM just falls back to
  // super-admin-only management (findAsmForCity returns null), same as any
  // newly-registered provider in a zone nobody has been assigned to yet.
  await asm.deleteOne();
  if (asm.user) {
    const user = await User.findById(asm.user);
    if (user) {
      // Clean up the dedicated per-ASM role along with the login itself —
      // it has no meaning once nothing references it.
      await Role.deleteMany({ _id: { $in: user.assignedRoles }, scope: 'platform', name: { $regex: '^ASM — ' } });
      await user.deleteOne();
    }
  }
  return { message: 'ASM deleted successfully' };
}
