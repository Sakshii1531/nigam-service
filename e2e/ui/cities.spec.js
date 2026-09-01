import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Browser-level tests for admin-configured operational cities.
 *
 * Two bugs these cover, both invisible to the api/ specs (the endpoints were
 * always correct) and to `vite build`:
 *
 *  1. super-admin/Cities.jsx read `data.data` off a response apiRequest had
 *     already unwrapped, so the table rendered empty no matter what was in the
 *     database — every successful "Add City" looked like it had silently
 *     failed.
 *  2. technician/Apply.jsx seeded its dropdown with a hardcoded
 *     ['Delhi NCR', 'Mumbai', ...] that was only replaced when the fetch
 *     returned rows. /tech/register resolves that value with an exact
 *     City.findOne({ name }), so applying from one of those fabricated options
 *     stored the technician with city: null.
 */

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;

async function otpFor(request, identifier) {
  const res = await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return (await res.json()).data.code;
}

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = await otpFor(request, identifier);
  const res = await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } });
  return (await res.json()).data;
}

async function superAdminSession(request) {
  const email = `cities-ui-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  return verifyOtp(request, 'super_admin', email);
}

async function createCity(request, token, city) {
  const res = await request.post(`${API}/super-admin/cities`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'Active', ...city },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

/** Put a real session in localStorage before any app code runs. */
async function signIn(page, session) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

test('a city added by the admin is listed in the Cities table', async ({ page, request }) => {
  const session = await superAdminSession(request);
  const name = `Testpur ${randomUUID().slice(0, 8)}`;
  await createCity(request, session.accessToken, { name, state: 'Testrajya', district: name });

  await signIn(page, session);
  await page.goto('/super-admin/cities');

  // The whole bug: this row exists server-side but never reached the table.
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
});

test('the technician application offers admin-configured cities, not hardcoded ones', async ({ page, request }) => {
  const session = await superAdminSession(request);
  const name = `Techville ${randomUUID().slice(0, 8)}`;
  await createCity(request, session.accessToken, { name, state: 'Testrajya', district: name });

  await page.goto('/technician/apply');

  const select = page.locator('select[name="city"]');
  await expect(select).toBeEnabled({ timeout: 15_000 });

  // The configured city is offered, labelled with its state...
  await expect(select.locator('option', { hasText: name })).toHaveCount(1);
  await expect(select.locator(`option[value="${name}"]`)).toHaveText(`${name}, Testrajya`);

  // ...and the fabricated fallbacks are gone. 'Delhi NCR' was never a City
  // document, so it could only ever have come from the hardcoded seed list.
  await expect(select.locator('option', { hasText: 'Delhi NCR' })).toHaveCount(0);

  // The value posted to /tech/register must be the bare name it matches on.
  await expect(select).toHaveValue(/.+/);
});

test('with no operational cities configured, the application offers none rather than fabricated ones', async ({ page }) => {
  // Forced at the network edge rather than by emptying the table: this is the
  // state a fresh deployment is in before the admin adds a city, and it is
  // exactly when the old hardcoded seed list used to surface.
  await page.route('**/api/v1/super-admin/cities/public', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], error: null, meta: {} }) }),
  );

  await page.goto('/technician/apply');

  const select = page.locator('select[name="city"]');
  await expect(select).toBeDisabled();
  await expect(select).toHaveValue('');
  for (const fake of ['Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata']) {
    await expect(select.locator('option', { hasText: fake })).toHaveCount(0);
  }
  await expect(page.getByText(/no service cities have been configured/i)).toBeVisible();
});
