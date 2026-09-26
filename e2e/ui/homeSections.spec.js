import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// docs/master-catalogue Phase 22 in the browser: an admin adds a real
// catalogue service to "Appliance repair & service"; the customer home shows
// it with its live catalogue price (no typed-in rating) and it opens that
// service's booking.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}

async function signIn(page, session, portal) {
  await page.addInitScript(([a, r, u, p]) => {
    const suffix = p ? `_${p}` : '';
    localStorage.setItem(`ncc_access_token${suffix}`, a);
    localStorage.setItem(`ncc_refresh_token${suffix}`, r);
    if (u) localStorage.setItem(`ncc_user${suffix}`, u);
  }, [session.accessToken, session.refreshToken, session.user ? JSON.stringify(session.user) : '', portal || '']);
}

test('an admin adds a real service to "Appliance repair & service" and the customer can book it', async ({ browser, request }) => {
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await verifyOtp(request, 'super_admin', email);
  const auth = { Authorization: `Bearer ${admin.accessToken}` };

  const adminPage = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await signIn(adminPage, admin, 'super_admin');
  await adminPage.goto('/super-admin/customer-app-customization?tab=applianceservices');
  await expect(adminPage.getByText('Price, “Instant” and rating are never typed in')).toBeVisible({ timeout: 15_000 });
  await adminPage.getByRole('button', { name: 'Add a service' }).click();
  const dialog = adminPage.getByRole('dialog', { name: 'Add a service' });
  await dialog.getByLabel('Search services').fill('fan inst');
  await dialog.getByRole('option', { name: /Fan Installation/ }).click();
  await expect(dialog.getByText('from ₹299').first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Save tile' }).click();
  await expect(adminPage.getByRole('list', { name: /Appliance repair & service tiles/ }).getByText('Fan Installation')).toBeVisible();

  try {
    const phone = uniquePhone();
    await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
    const customer = await verifyOtp(request, 'customer', phone);
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await signIn(page, customer);
    await page.goto('/dashboard');
    const row = page.getByRole('region', { name: 'Appliance repair & service' });
    const card = row.getByRole('button', { name: /Fan Installation/ });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText('from ₹299');
    // No review exists for it, so no rating is shown — nothing invented.
    await expect(card.getByText(/★|\d\.\d{1,2}\s*\(/)).toHaveCount(0);
    await card.click();
    await expect(page).toHaveURL(/\/book\/Electrician\?svc=fan_installation/);
  } finally {
    const tiles = (await (await request.get(`${API}/cms/home-tiles/admin?placement=appliance-service`, { headers: auth })).json()).data;
    for (const t of tiles.filter((x) => x.title === 'Fan Installation')) {
      await request.delete(`${API}/cms/home-tiles/${t.id}`, { headers: auth });
    }
  }
});
