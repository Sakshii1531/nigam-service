import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// An admin can add banner carousels to the customer home screen (Home layout →
// Add a section → Banner carousel), upload banners into them, and manage every
// banner strip — including the warranty ones — from the Banners tab.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function verifyOtp(request, role, identifier) {
  const loginRes = await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  expect(loginRes.status()).toBe(200);
  if (role === 'customer') return (await loginRes.json()).data;
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

// A wide banner picture drawn in the browser.
async function bannerPicture(page, colour) {
  const base64 = await page.evaluate(async (fill) => {
    const c = document.createElement('canvas');
    c.width = 670; c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = fill; x.fillRect(0, 0, 670, 200);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s);
  }, colour);
  return { name: 'banner.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

test('an admin adds a banner section, uploads a banner into it, and the customer sees it', async ({ browser, request }) => {
  test.setTimeout(180_000);
  const tag = randomUUID().slice(0, 6).toUpperCase();
  const sectionName = `Festive ${tag}`;
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await verifyOtp(request, 'super_admin', email);

  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = await verifyOtp(request, 'customer', phone);
  const shopper = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signIn(shopper, customer);

  const adminPage = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await signIn(adminPage, admin, 'super_admin');

  // The Banners tab manages all three built-in strips, including the warranty ones.
  await adminPage.goto('/super-admin/customer-app-customization?tab=banners');
  const tabs = adminPage.getByRole('tablist', { name: 'Banner strips' });
  await expect(tabs.getByRole('tab')).toHaveCount(3, { timeout: 15_000 });
  await tabs.getByRole('tab', { name: 'Warranty banners' }).click();
  await expect(adminPage.getByRole('heading', { name: 'Warranty banners' })).toBeVisible();

  // Add a banner carousel from Home layout; the admin lands in its banner manager.
  await adminPage.goto('/super-admin/customer-app-customization?tab=layout');
  await adminPage.getByRole('button', { name: 'Add a section' }).click();
  const dialog = adminPage.getByRole('dialog');
  await dialog.getByRole('radio', { name: /Banner carousel/ }).check();
  await dialog.getByLabel('Section heading').fill(sectionName);
  await dialog.getByRole('button', { name: 'Add section' }).click();
  await expect(adminPage.getByRole('heading', { name: sectionName })).toBeVisible({ timeout: 15_000 });

  await adminPage.getByLabel('Banner picture').setInputFiles(await bannerPicture(adminPage, '#1565c0'));
  await expect(adminPage.getByAltText('Selected banner preview')).toBeVisible({ timeout: 30_000 });
  await adminPage.getByLabel('Banner link').fill('/services');
  await adminPage.getByRole('button', { name: 'Publish banner' }).click();
  await expect(adminPage.getByRole('list', { name: 'Banners' }).getByRole('listitem')).toHaveCount(1, { timeout: 15_000 });
  await expect(adminPage.getByText('Opens /services')).toBeVisible();

  // The customer's home shows it, and tapping it follows the link.
  await shopper.goto('/dashboard');
  const strip = shopper.getByLabel(sectionName, { exact: true });
  await expect(strip.locator('img')).toHaveCount(1, { timeout: 15_000 });
  await strip.getByRole('button').click();
  await expect(shopper).toHaveURL(/\/services/);

  // Hiding the banner takes it off the customer's screen.
  await adminPage.getByRole('button', { name: 'Hide banner 1' }).click();
  await expect(adminPage.getByText('Hidden', { exact: true })).toBeVisible({ timeout: 15_000 });
  await shopper.goto('/dashboard');
  await expect(shopper.getByLabel(sectionName, { exact: true })).toHaveCount(0);

  // Clean up: deleting the section deletes its banner.
  const auth = { Authorization: `Bearer ${admin.accessToken}` };
  const layout = (await (await request.get(`${API}/cms/home-layout/admin`, { headers: auth })).json()).data;
  const removed = await request.delete(`${API}/cms/home-layout/${layout.find((s) => s.title === sectionName).id}`, { headers: auth });
  expect(removed.status()).toBe(200);
  expect((await (await request.get(`${API}/cms/home-layout/admin`, { headers: auth })).json()).data.some((s) => s.title === sectionName)).toBe(false);
});
