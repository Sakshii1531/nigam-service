import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// docs/master-catalogue Phase 19 in the browser: Super Admin → Categories &
// Brands → Catalogue Brands manages the brands a customer picks on a
// product-linked booking. They are not partner brands (Brand Partners).

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

test('an admin adds a catalogue brand for AC and the customer can pick it on an AC booking', async ({ browser, request }) => {
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await verifyOtp(request, 'super_admin', email);
  const brandName = `Brand ${randomUUID().slice(0, 8)}`;

  const adminPage = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await signIn(adminPage, admin, 'super_admin');
  await adminPage.goto('/super-admin/product-categories');
  await adminPage.getByRole('button', { name: /Catalogue Brands/ }).click();
  await expect(adminPage.getByText('Partner brands with a brand-admin login are in Brand Partners')).toBeVisible();
  await expect(adminPage.getByRole('row', { name: /Voltas/ }).first()).toBeVisible({ timeout: 15_000 });

  await adminPage.getByRole('button', { name: 'Add New Brand' }).click();
  await adminPage.getByLabel('Brand Name').fill(brandName);
  await adminPage.getByRole('button', { name: 'AC', exact: true }).click();
  // Standalone-only categories are not offered — a plumber never asks for a brand.
  await expect(adminPage.getByRole('button', { name: 'Plumber', exact: true })).toHaveCount(0);
  await adminPage.getByLabel('Warranty (months)').fill('24');
  await adminPage.getByRole('button', { name: 'Create Brand' }).click();
  const row = adminPage.getByRole('row', { name: new RegExp(brandName) });
  await expect(row).toBeVisible();
  await expect(row.getByText('24 months')).toBeVisible();

  // It is not a partner brand.
  await adminPage.goto('/super-admin/brands');
  await expect(adminPage.getByText(brandName)).toHaveCount(0);

  const auth = { Authorization: `Bearer ${admin.accessToken}` };
  try {
    const phone = uniquePhone();
    await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
    const customer = await verifyOtp(request, 'customer', phone);
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await signIn(page, customer);
    await page.goto('/book/AC');
    await expect(page.getByRole('heading', { name: /Select AC Type/i })).toBeVisible({ timeout: 15_000 });
    await page.getByText('Split AC').click();
    await page.getByRole('button', { name: /^1\.5 Ton/ }).click();
    await page.getByRole('button', { name: /Continue — Select Service/i }).click();
    await page.getByRole('button', { name: /Repair/i }).first().click();
    await page.getByRole('button', { name: /Continue — Schedule Visit/i }).click();
    await expect(page.getByText('Select Brand *')).toBeVisible();
    await page.locator('select').first().selectOption(brandName);
    await expect(page.locator('select').first()).toHaveValue(brandName);
  } finally {
    const list = (await (await request.get(`${API}/super-admin/catalogue/brands`, { headers: auth })).json()).data;
    const mine = list.find((b) => b.name === brandName);
    if (mine) await request.delete(`${API}/super-admin/catalogue/brands/${mine.id}`, { headers: auth });
  }
});

test('Brand Partners: warranty months and support contacts can be edited', async ({ page, request }) => {
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await verifyOtp(request, 'super_admin', email);
  const name = `Partner ${randomUUID().slice(0, 8)}`;
  await request.post(`${API}/super-admin/brands`, { headers: { Authorization: `Bearer ${admin.accessToken}` }, data: { name, status: 'Active' } });

  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, admin, 'super_admin');
  await page.goto('/super-admin/brands');
  await page.getByRole('row', { name: new RegExp(name) }).getByTitle(/view|profile/i).first().click();
  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('Warranty (months)').fill('36');
  await page.getByLabel('Support email').fill('care@partner.test');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('36-month manufacturer warranty')).toBeVisible();
  await expect(page.getByText('care@partner.test')).toBeVisible();
});
