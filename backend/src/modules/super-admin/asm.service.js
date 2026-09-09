import { ASM } from './asm.model.js';
import { User } from '../auth/user.model.js';
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
  return ASM.find(query).populate('city', 'name').sort({ name: 1 });
}

async function findOr404(id) {
  const asm = await ASM.findById(id);
  if (!asm) throw new ApiError(404, 'ASM not found');
  return asm;
}

export async function getAsm(id) {
  return findOr404(id);
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
  return asm;
}

/**
 * Creates the ASM profile and its login (User role: ASM) together — there is
 * no separate "invite" flow in this app (OTP delivery itself is just a
 * console-logged stub outside a real SMS provider), so the super-admin sets
 * an initial password directly, the same way every other role's credentials
 * originate in this codebase.
 */
export async function createAsm({ name, email, phone, city, rating, password }) {
  if (!password || password.length < 6) {
    throw new ApiError(400, 'A password of at least 6 characters is required to create the ASM\'s login');
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
  });

  try {
    return await ASM.create({ name, email, phone, city, rating, user: user._id });
  } catch (err) {
    // Keep the two documents consistent — an ASM profile that failed to
    // create (e.g. the unique-city race) must not leave an orphaned login.
    await User.findByIdAndDelete(user._id);
    throw err;
  }
}

const EDITABLE_FIELDS = ['name', 'email', 'phone', 'city', 'rating'];

export async function updateAsm(id, updates) {
  const asm = await findOr404(id);
  if (updates.city && String(updates.city) !== String(asm.city)) {
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
  // email/phone the super-admin just changed on their profile.
  if (asm.user && (updates.name !== undefined || updates.email !== undefined || updates.phone !== undefined)) {
    const userUpdates = {};
    if (updates.name !== undefined) userUpdates.name = updates.name;
    if (updates.email !== undefined) userUpdates.email = updates.email || undefined;
    if (updates.phone !== undefined) userUpdates.phone = updates.phone || undefined;
    await User.findByIdAndUpdate(asm.user, userUpdates);
  }
  if (updates.password) {
    if (updates.password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
    await User.findByIdAndUpdate(asm.user, { passwordHash: await hashPassword(updates.password) });
  }

  return asm;
}

export async function deleteAsm(id) {
  const asm = await findOr404(id);

  // No reassignment needed: a zone with no ASM just falls back to
  // super-admin-only management (findAsmForCity returns null), same as any
  // newly-registered provider in a zone nobody has been assigned to yet.
  await asm.deleteOne();
  if (asm.user) await User.findByIdAndDelete(asm.user);
  return { message: 'ASM deleted successfully' };
}
