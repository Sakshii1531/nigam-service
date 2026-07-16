import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/** `jti` guarantees two refresh tokens for the same user are never byte-identical
 * even when signed within the same second (JWT `iat` has 1s resolution) — without
 * it, rotating a refresh token right after login can produce the exact same token
 * twice, which collides on RefreshToken.tokenHash's unique index. */
export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, jti: randomUUID() }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

/** Refresh tokens are stored in RefreshToken.tokenHash, never in plaintext (same reasoning as password hashing). */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** exp comes back in seconds since epoch (standard JWT claim) — convert once here so callers just get a Date. */
export function tokenExpiryDate(token) {
  const { exp } = jwt.decode(token);
  return new Date(exp * 1000);
}
