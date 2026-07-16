import { describe, it, expect } from '@jest/globals';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  tokenExpiryDate,
} from '../src/modules/auth/tokens.js';

describe('access tokens', () => {
  it('round-trips a payload through sign/verify', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'customer' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('customer');
  });

  it('rejects a token signed with a different secret', () => {
    const refreshToken = signRefreshToken({ sub: 'user-1' });
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('are never byte-identical for the same payload, even signed in the same tick', () => {
    const a = signRefreshToken({ sub: 'user-1' });
    const b = signRefreshToken({ sub: 'user-1' });
    expect(a).not.toBe(b);
    expect(hashToken(a)).not.toBe(hashToken(b));
  });

  it('round-trips through sign/verify and carries a jti', () => {
    const token = signRefreshToken({ sub: 'user-1' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(typeof decoded.jti).toBe('string');
  });
});

describe('hashToken', () => {
  it('is deterministic for the same input', () => {
    const token = signRefreshToken({ sub: 'user-1' });
    expect(hashToken(token)).toBe(hashToken(token));
  });
});

describe('tokenExpiryDate', () => {
  it('returns a Date derived from the JWT exp claim', () => {
    const token = signAccessToken({ sub: 'user-1' });
    const expiry = tokenExpiryDate(token);
    expect(expiry).toBeInstanceOf(Date);
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });
});
