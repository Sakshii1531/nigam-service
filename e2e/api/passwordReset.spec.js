import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// The forgot/reset-password pair. The frontend's ForgotPassword screen was pure
// UI simulation until now — it never called these, so a password reset silently
// did nothing. These specs pin the contract that screen depends on.

async function getOtpCode(request, identifier) {
  const res = await request.get(`/api/v1/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return (await res.json()).data.code;
}

async function loginAndVerify(request, { role, identifier, password }) {
  const loginRes = await request.post('/api/v1/auth/login', { data: { role, identifier, password } });
  expect(loginRes.status()).toBe(200);
  const code = await getOtpCode(request, identifier);
  const res = await request.post('/api/v1/auth/otp/verify', { data: { role, identifier, code } });
  return (await res.json()).data.accessToken;
}

async function createCustomer(request, password = 'password123') {
  const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone, password } });
  return phone;
}

test.describe('forgot / reset password', () => {
  test('resets the password end to end: the new one works and the old one stops working', async ({ request }) => {
    const phone = await createCustomer(request, 'password123');

    // Step 1 — request a code.
    const forgotRes = await request.post('/api/v1/auth/forgot-password', {
      data: { role: 'customer', identifier: phone },
    });
    expect(forgotRes.status()).toBe(200);
    // Returns a masked destination for the UI to display, never the raw value.
    expect((await forgotRes.json()).data.destination).toMatch(/\*/);

    const code = await getOtpCode(request, phone);

    // Step 2 — set a new password with that code.
    const resetRes = await request.post('/api/v1/auth/reset-password', {
      data: { role: 'customer', identifier: phone, code, newPassword: 'brandnewpass456' },
    });
    expect(resetRes.status()).toBe(200);

    // The new password authenticates...
    const token = await loginAndVerify(request, {
      role: 'customer', identifier: phone, password: 'brandnewpass456',
    });
    expect(token).toBeTruthy();

    // ...and the old one no longer does.
    const staleRes = await request.post('/api/v1/auth/login', {
      data: { role: 'customer', identifier: phone, password: 'password123' },
    });
    expect(staleRes.status()).toBe(401);
  });

  test('does not reveal whether an account exists', async ({ request }) => {
    const known = await createCustomer(request);
    const unknown = `9${Math.floor(100000000 + Math.random() * 899999999)}`;

    const knownRes = await request.post('/api/v1/auth/forgot-password', {
      data: { role: 'customer', identifier: known },
    });
    const unknownRes = await request.post('/api/v1/auth/forgot-password', {
      data: { role: 'customer', identifier: unknown },
    });

    // Same status and same response shape either way — an attacker cannot use
    // this endpoint to enumerate registered identifiers.
    expect(knownRes.status()).toBe(unknownRes.status());
    expect(Object.keys((await knownRes.json()).data)).toEqual(
      Object.keys((await unknownRes.json()).data),
    );
  });

  test('rejects a wrong code and a reused one', async ({ request }) => {
    const phone = await createCustomer(request);

    await request.post('/api/v1/auth/forgot-password', { data: { role: 'customer', identifier: phone } });
    const code = await getOtpCode(request, phone);

    const wrongRes = await request.post('/api/v1/auth/reset-password', {
      data: { role: 'customer', identifier: phone, code: '000000', newPassword: 'somethingelse1' },
    });
    expect(wrongRes.status()).toBeGreaterThanOrEqual(400);

    const firstRes = await request.post('/api/v1/auth/reset-password', {
      data: { role: 'customer', identifier: phone, code, newPassword: 'firstreset123' },
    });
    expect(firstRes.status()).toBe(200);

    // A consumed code must not work twice.
    const replayRes = await request.post('/api/v1/auth/reset-password', {
      data: { role: 'customer', identifier: phone, code, newPassword: 'secondreset123' },
    });
    expect(replayRes.status()).toBeGreaterThanOrEqual(400);
  });

  test('rejects a password shorter than the minimum', async ({ request }) => {
    const phone = await createCustomer(request);
    await request.post('/api/v1/auth/forgot-password', { data: { role: 'customer', identifier: phone } });
    const code = await getOtpCode(request, phone);

    const res = await request.post('/api/v1/auth/reset-password', {
      data: { role: 'customer', identifier: phone, code, newPassword: 'abc' },
    });
    expect(res.status()).toBe(400);
  });

  test('works for an admin role too, not just customers', async ({ request }) => {
    const email = `reset-admin-${randomUUID()}@e2e.test`;
    await request.post('/api/v1/_dev/test-user', {
      data: { role: 'super_admin', email, password: 'password123' },
    });

    await request.post('/api/v1/auth/forgot-password', {
      data: { role: 'super_admin', identifier: email },
    });
    const code = await getOtpCode(request, email);

    const resetRes = await request.post('/api/v1/auth/reset-password', {
      data: { role: 'super_admin', identifier: email, code, newPassword: 'adminnewpass789' },
    });
    expect(resetRes.status()).toBe(200);

    const token = await loginAndVerify(request, {
      role: 'super_admin', identifier: email, password: 'adminnewpass789',
    });
    expect(token).toBeTruthy();
  });
});
