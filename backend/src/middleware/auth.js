import { verifyAccessToken } from '../modules/auth/tokens.js';
import { ApiError } from './errorHandler.js';

/** Verifies the JWT access token and attaches { id, role, brand, permissions } to
 * req.user — stateless (no DB hit), so permissions reflect a snapshot from token
 * issuance time (stale for up to JWT_ACCESS_EXPIRES_IN, currently 15m). */
export function requireAuth(req, res, next) {
  let token = '';
  const header = req.headers.authorization || '';
  const [scheme, parsedToken] = header.split(' ');
  
  if (scheme === 'Bearer' && parsedToken) {
    token = parsedToken;
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new ApiError(401, 'Missing or malformed Authorization header or token query parameter'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, brand: payload.brand, permissions: payload.permissions || [] };
    next();
  } catch (err) {
    next(new ApiError(401, 'Invalid or expired access token'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) return next(new ApiError(403, 'Insufficient role'));
    next();
  };
}

export function requirePermission(key) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (!req.user.permissions.includes(key)) return next(new ApiError(403, `Missing permission: ${key}`));
    next();
  };
}

/** Guards brand-admin routes: must be a brand_admin with an actual brand attached.
 * Route handlers still scope their own queries by req.user.brand — this only
 * rejects requests that shouldn't reach a brand-scoped route at all. */
export function requireBrandScope(req, res, next) {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  if (req.user.role !== 'brand_admin') return next(new ApiError(403, 'Brand-admin account required'));
  if (!req.user.brand) return next(new ApiError(403, 'Account is not linked to a brand'));
  next();
}
