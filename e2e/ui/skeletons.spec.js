import { test, expect } from '@playwright/test';

// Partial loading: each section of a screen shows a skeleton only while its
// own request is pending — everything already fetched renders at once.
// (One API is held back here; the rest of the page must not wait for it.)

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function customer(page, request) {
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  await request.post(`${API}/auth/login`, { data: { role: 'customer', identifier: phone, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${phone}`)).json()).data.code;
  const session = (await (await request.post(`${API}/auth/otp/verify`, { data: { role: 'customer', identifier: phone, code } })).json()).data;
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

/** Holds one API route until `release()` is called. */
async function holdRoute(page, pattern) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route(pattern, async (route) => {
    await gate;
    await route.continue();
  });
  return () => release();
}

test.use({ viewport: { width: 390, height: 844 } });

test('home: the service rows show skeletons while their data is pending; the rest of the page is already there', async ({ page, request }) => {
  await customer(page, request);
  const release = await holdRoute(page, '**/api/v1/catalog/home-sections**');
  await page.goto('/dashboard');

  // Other sections have rendered with real data…
  await expect(page.getByRole('heading', { name: 'Our Services' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('AC', { exact: true }).first()).toBeVisible();
  // …while the held section shows its skeleton, not a spinner or an empty gap.
  const pending = page.getByRole('status').filter({ hasText: 'Loading Most Booked Services…' });
  await expect(pending).toBeAttached();
  await expect(pending).toHaveAttribute('aria-busy', 'true');

  release();
  await expect(pending).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('region', { name: 'Appliance repair & service' })).toBeVisible();
});

test('notifications: a skeleton list, never "no notifications", while the feed is loading', async ({ page, request }) => {
  await customer(page, request);
  const release = await holdRoute(page, '**/api/v1/notifications?limit=50');
  await page.goto('/notifications');
  await expect(page.getByRole('status').filter({ hasText: 'Loading notifications…' })).toBeAttached({ timeout: 15_000 });
  await expect(page.getByText('You have no notifications yet.')).toHaveCount(0);
  release();
  // The skeleton gives way to the real feed (empty or not).
  await expect(page.getByRole('status').filter({ hasText: 'Loading notifications…' })).toHaveCount(0, { timeout: 15_000 });
});

test('booking details: a page-shaped skeleton instead of a spinner while the booking loads', async ({ page, request }) => {
  await customer(page, request);
  const release = await holdRoute(page, '**/api/v1/bookings/*');
  await page.goto('/bookings/000000000000000000000000');
  await expect(page.getByRole('status').filter({ hasText: 'Loading booking details…' })).toBeAttached({ timeout: 15_000 });
  release();
  await expect(page.getByRole('heading', { name: 'Booking Not Found' })).toBeVisible({ timeout: 15_000 });
});
