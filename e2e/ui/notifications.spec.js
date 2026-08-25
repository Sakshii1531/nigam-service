import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Browser-level smoke tests for the notification system.
 *
 * The api/ specs prove the server behaves; a `vite build` proves the frontend's
 * modules resolve. Neither proves the React tree actually renders with
 * NotificationProvider mounted, or that a broadcast reaches an open screen —
 * which is the whole point of the live feed.
 *
 * Deliberately small: this is a smoke suite, not UI coverage.
 */

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const otp = await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`);
  const code = (await otp.json()).data.code;
  const res = await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } });
  return (await res.json()).data;
}

async function signedInCustomer(request) {
  const phone = `9${randomUUID().replace(/\D/g, '').slice(0, 9).padEnd(9, '0')}`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  return verifyOtp(request, 'customer', phone);
}

async function superAdminToken(request) {
  const email = `sa-ui-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  return (await verifyOtp(request, 'super_admin', email)).accessToken;
}

/** Put a real session in localStorage before any app code runs. */
async function signIn(page, session) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

/** Uncaught errors and real console errors, minus unrelated network noise. */
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/favicon|Failed to load resource|ERR_INTERNET_DISCONNECTED/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

test('the app renders signed-out with the notification provider mounted', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // NotificationProvider wraps the whole tree; if it threw for a signed-out
  // visitor (no token, no socket) this would be a white screen.
  expect(errors).toEqual([]);
});

test('a signed-in customer can open the notification feed', async ({ page, request }) => {
  await signIn(page, await signedInCustomer(request));
  const errors = watchErrors(page);

  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText(/notification/i).first()).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('a broadcast sent while the feed is open arrives over the socket', async ({ page, request }) => {
  const session = await signedInCustomer(request);
  const adminToken = await superAdminToken(request);
  await signIn(page, session);

  const errors = watchErrors(page);
  await page.goto('/notifications');
  await page.waitForLoadState('networkidle');

  // Sent AFTER the initial fetch has settled, so appearing on screen can only
  // be the live socket path — the regression this guards is `notification:new`
  // having no listener at all, which is how it shipped for several phases.
  const title = `Live check ${randomUUID().slice(0, 8)}`;
  const sent = await request.post(`${API}/notifications/push`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { broadcastRole: 'Customers', title, body: 'Arrived over the socket', type: 'promo', channels: ['inapp'] },
  });
  expect(sent.status()).toBe(201);

  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});
