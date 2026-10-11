import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Brand permission enforcement (docs/brand-crm ARCHITECTURE §6.3, README D8).
//
// A brand user's permissions are read from the database — the union of their
// brand roles — not from the JWT, so taking a role away works at once rather
// than when the access token expires. A short in-memory cache keeps that to
// one query per user per minute; anything that changes roles or users in this
// process clears it immediately, other processes catch up within the TTL.

const TTL_MS = 60 * 1000;
const cache = new Map(); // userId → { at, status, brand, permissions: Set, roles: [{ id, name, template }] }

export function invalidateBrandPermissions(userId) {
  if (userId) cache.delete(String(userId));
  else cache.clear();
}

/** Effective brand access of a user, cached. null if the user doesn't exist. */
export async function loadBrandAccess(userId) {
  const key = String(userId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;

  const user = await User.findById(userId).select('status brand role assignedRoles').lean();
  if (!user) {
    cache.delete(key);
    return null;
  }
  const roles = user.brand
    ? await User.populate(user, {
      path: 'assignedRoles',
      match: { scope: 'brand', brand: user.brand },
      select: 'name template permissions',
      populate: { path: 'permissions', select: 'key scope' },
    }).then((u) => (u.assignedRoles || []).filter(Boolean))
    : [];
  const permissions = new Set(
    roles.flatMap((r) => (r.permissions || []).filter((p) => p && p.scope === 'brand').map((p) => p.key)),
  );
  const access = {
    at: Date.now(),
    status: user.status,
    role: user.role,
    brand: user.brand ? String(user.brand) : null,
    permissions,
    roles: roles.map((r) => ({ id: String(r._id), name: r.name, template: r.template || null })),
  };
  cache.set(key, access);
  return access;
}

/** Any brand user, whatever their roles — for things every brand user needs (their own profile, the support number). */
export const ANY_BRAND_USER = '*';

async function check(req, keys) {
  const access = await loadBrandAccess(req.user.id);
  if (!access || access.status !== 'Active') throw new ApiError(401, 'This account is not active');
  if (access.role !== 'brand_admin' || !access.brand || access.brand !== String(req.user.brand)) {
    throw new ApiError(401, 'Your account scope has changed. Sign in again');
  }
  req.brandAccess = access;
  req.user.permissions = [...access.permissions];
  if (keys.includes(ANY_BRAND_USER)) return;
  if (!keys.some((k) => access.permissions.has(k))) {
    throw new ApiError(403, `Missing permission: ${keys.join(' or ')}`, { required: keys });
  }
}

/**
 * Allows the request when the brand user holds ANY of `keys`. Use after
 * requireAuth + requireBrandScope.
 */
export function requireBrandPermission(...keys) {
  return (req, res, next) => {
    check(req, keys).then(() => next(), next);
  };
}

/**
 * For routes shared with other roles (service requests, reviews): checked only
 * when the caller is a brand user, so customers, partners and admins are
 * unaffected.
 */
export function requireBrandPermissionIfBrand(...keys) {
  return (req, res, next) => {
    if (req.user?.role !== 'brand_admin') return next();
    return check(req, keys).then(() => next(), next);
  };
}
