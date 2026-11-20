import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createTestOffering } from '../catalogueFixture.js';

// Services show the picture an admin uploaded — never an emoji. A plain
// (white) background is removed on upload, and the customer's
// "Appliance Repair & Service" page shows that picture.

const API_ORIGIN = process.env.UI_API_ORIGIN || 'http://localhost:4111';
const API = `${API_ORIGIN}/api/v1`;

async function adminSession(request) {
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  await request.post(`${API}/auth/login`, { data: { role: 'super_admin', identifier: email, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(email)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role: 'super_admin', email, identifier: email, code } })).json()).data;
}

async function customerPage(browser, request) {
  const phone = `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const session = (await (await request.post(`${API}/auth/login`, { data: { role: 'customer', identifier: phone, password: 'password123' } })).json()).data;
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
  return page;
}

// A "product photo": a red rounded block on a plain white backdrop.
async function productPhoto(page) {
  const base64 = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 240;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 320, 240);
    x.fillStyle = '#d32f2f'; x.fillRect(80, 60, 160, 120);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s);
  });
  return { name: 'product.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

test('an admin uploads a service picture, the white background is removed, and customers see the picture', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const admin = await adminSession(request);
  const auth = { Authorization: `Bearer ${admin.accessToken}` };
  const tag = randomUUID().slice(0, 6).toUpperCase();
  const serviceName = `Picture Test ${tag}`;
  await createTestOffering(request, admin.accessToken, 'Electrician', { serviceName, price: 399, api: `${API}` });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token_super_admin', a);
    localStorage.setItem('ncc_refresh_token_super_admin', r);
    localStorage.setItem('ncc_user_super_admin', u);
  }, [admin.accessToken, admin.refreshToken, JSON.stringify(admin.user)]);

  await page.goto('/super-admin/service-catalog');
  await page.getByRole('navigation', { name: 'Categories' }).getByRole('button', { name: /Electrician/ }).click();
  await page.getByRole('button', { name: `Edit ${serviceName}` }).click();

  // The old text/emoji box is gone; there is a picture upload instead.
  await expect(page.getByLabel('Icon')).toHaveCount(0);
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Upload service picture').setInputFiles(await productPhoto(page));
  await expect(modal.getByRole('status')).toContainText('Background removed', { timeout: 30_000 });
  await expect(modal.locator('img')).toBeVisible();
  await modal.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: `Edit ${serviceName}` })).toBeVisible();

  // Stored as an image address, and the picture really has a transparent background.
  const groups = (await (await request.get(`${API}/catalog/service-groups`)).json()).data;
  const group = groups.find((g) => g.title === serviceName);
  expect(group.imageUrl).toMatch(/\.(webp|png)$/);
  const alpha = await page.evaluate(async (url) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    return { corner: x.getImageData(1, 1, 1, 1).data[3], centre: x.getImageData(img.width >> 1, img.height >> 1, 1, 1).data[3] };
  }, group.imageUrl.startsWith('http') ? group.imageUrl : `${API_ORIGIN}${group.imageUrl}`);
  expect(alpha.corner).toBe(0);
  expect(alpha.centre).toBe(255);

  // Customer page: the card shows that picture, and no emoji anywhere.
  const shopper = await customerPage(browser, request);
  await shopper.goto('/appliance-services');
  const card = shopper.getByRole('img', { name: serviceName });
  await expect(card).toBeVisible({ timeout: 20_000 });
  expect(await card.getAttribute('src')).toContain(group.imageUrl.split('/').pop());
  const text = await shopper.locator('body').innerText();
  expect(text).not.toMatch(/\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u);
});

test('a service with no picture shows a neutral icon, not text or an emoji', async ({ browser, request }) => {
  const admin = await adminSession(request);
  const serviceName = `No Picture ${randomUUID().slice(0, 6).toUpperCase()}`;
  await createTestOffering(request, admin.accessToken, 'Electrician', { serviceName, price: 299, api: `${API}` });
  const shopper = await customerPage(browser, request);
  await shopper.goto('/appliance-services');
  await expect(shopper.getByText(serviceName)).toBeVisible({ timeout: 20_000 });
  const text = await shopper.locator('body').innerText();
  expect(text).not.toMatch(/\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u);
});
