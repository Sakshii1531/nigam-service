import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/auth/auth.routes.js end-to-end against the real running
// server + a real Mongo database — complements backend/tests/auth.test.js (which is
// faster but in-process/mocked-OTP-capture). Fixture users are created via the
// NODE_ENV=test-only POST /_dev/test-user route (no signup endpoint exists yet);
// OTP codes are read back via GET /_dev/last-otp/:identifier (the 'test' OTP
// provider, set via playwright.config.js's webServer env, captures them in-memory
// instead of console.log so this suite can read them over HTTP).

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

async function createTestUser(request, { role, phone, email, password }) {
  const res = await request.post('/api/v1/_dev/test-user', { data: { role, phone, email, password } });
  expect(res.status()).toBe(201);
}

async function getOtpCode(request, identifier) {
  const res = await request.get(`/api/v1/_dev/last-otp/${encodeURIComponent(identifier)}`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.data.code;
}

async function loginAndVerify(request, { role, identifier, password }) {
  const loginRes = await request.post('/api/v1/auth/login', { data: { role, identifier, password } });
  expect(loginRes.status()).toBe(200);

  const code = await getOtpCode(request, identifier);
  const verifyRes = await request.post('/api/v1/auth/otp/verify', { data: { role, identifier, code } });
  expect(verifyRes.status()).toBe(200);
  return (await verifyRes.json()).data;
}

test.describe('login -> OTP verify -> protected route', () => {
  test('issues a working access token after the full flow', async ({ request }) => {
    const phone = uniquePhone();
    await createTestUser(request, { role: 'customer', phone, password: 'password123' });

    const session = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });
    expect(session.accessToken).toBeTruthy();
    expect(session.user.passwordHash).toBeUndefined();

    const whoami = await request.get('/api/v1/_dev/whoami', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(whoami.status()).toBe(200);
    expect((await whoami.json()).data.role).toBe('customer');
  });

  test('rejects a wrong password with 401', async ({ request }) => {
    const phone = uniquePhone();
    await createTestUser(request, { role: 'customer', phone, password: 'password123' });

    const res = await request.post('/api/v1/auth/login', {
      data: { role: 'customer', identifier: phone, password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('rejects a malformed body with a 400 validation envelope', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', { data: { role: 'not-a-role' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.message).toBe('Validation failed');
  });
});

test.describe('RBAC', () => {
  test('grants a super_admin access to an admin-only route', async ({ request }) => {
    const email = `super-${randomUUID()}@e2e.test`;
    await createTestUser(request, { role: 'super_admin', email, password: 'password123' });
    const session = await loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });

    const res = await request.get('/api/v1/_dev/admin-only', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('rejects a customer from an admin-only route with 403', async ({ request }) => {
    const phone = uniquePhone();
    await createTestUser(request, { role: 'customer', phone, password: 'password123' });
    const session = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });

    const res = await request.get('/api/v1/_dev/admin-only', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('rejects a request with no Authorization header with 401', async ({ request }) => {
    const res = await request.get('/api/v1/_dev/whoami');
    expect(res.status()).toBe(401);
  });
});

test.describe('refresh token rotation', () => {
  test('rotates on refresh and invalidates the old token', async ({ request }) => {
    const phone = uniquePhone();
    await createTestUser(request, { role: 'customer', phone, password: 'password123' });
    const session = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });

    const refreshRes = await request.post('/api/v1/auth/refresh', { data: { refreshToken: session.refreshToken } });
    expect(refreshRes.status()).toBe(200);
    const refreshed = (await refreshRes.json()).data;
    expect(refreshed.refreshToken).not.toBe(session.refreshToken);

    const reuseRes = await request.post('/api/v1/auth/refresh', { data: { refreshToken: session.refreshToken } });
    expect(reuseRes.status()).toBe(401);
  });
});

test.describe('logout', () => {
  test('revokes the refresh token', async ({ request }) => {
    const phone = uniquePhone();
    await createTestUser(request, { role: 'customer', phone, password: 'password123' });
    const session = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });

    const logoutRes = await request.post('/api/v1/auth/logout', { data: { refreshToken: session.refreshToken } });
    expect(logoutRes.status()).toBe(200);

    const refreshRes = await request.post('/api/v1/auth/refresh', { data: { refreshToken: session.refreshToken } });
    expect(refreshRes.status()).toBe(401);
  });
});

test.describe('forgot / reset password', () => {
  test('resets the password via OTP and the new password works', async ({ request }) => {
    const phone = uniquePhone();
    await createTestUser(request, { role: 'customer', phone, password: 'oldpassword' });

    const forgotRes = await request.post('/api/v1/auth/forgot-password', { data: { role: 'customer', identifier: phone } });
    expect(forgotRes.status()).toBe(200);
    const code = await getOtpCode(request, phone);

    const resetRes = await request.post('/api/v1/auth/reset-password', {
      data: { role: 'customer', identifier: phone, code, newPassword: 'newpassword' },
    });
    expect(resetRes.status()).toBe(200);

    const oldLoginRes = await request.post('/api/v1/auth/login', {
      data: { role: 'customer', identifier: phone, password: 'oldpassword' },
    });
    expect(oldLoginRes.status()).toBe(401);

    const newLoginRes = await request.post('/api/v1/auth/login', {
      data: { role: 'customer', identifier: phone, password: 'newpassword' },
    });
    expect(newLoginRes.status()).toBe(200);
  });
});
