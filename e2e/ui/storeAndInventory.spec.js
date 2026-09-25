import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// docs/master-catalogue Phases 20–21 in the browser: an NCC product is
// created as a full listing and opens on its own detail page; a spare part is
// added, restocked and its stock history shows the change.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const PICTURE = fileURLToPath(new URL('../../frontend/src/assets/categories/split_ac.png', import.meta.url));

async function adminSession(request) {
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  await request.post(`${API}/auth/login`, { data: { role: 'super_admin', identifier: email, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(email)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role: 'super_admin', identifier: email, code } })).json()).data;
}

async function signIn(page, session) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token_super_admin', a);
    localStorage.setItem('ncc_refresh_token_super_admin', r);
    localStorage.setItem('ncc_user_super_admin', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

test.use({ viewport: { width: 1440, height: 900 } });

test('NCC Products: create a detailed listing and open its detail page', async ({ page, request }) => {
  const admin = await adminSession(request);
  const name = `E2E Split AC ${randomUUID().slice(0, 6)}`;
  await signIn(page, admin);
  await page.goto('/super-admin/products');
  await page.getByRole('link', { name: 'Add product' }).click();

  await page.getByLabel('Product name *').fill(name);
  await page.getByLabel('Store category *').selectOption({ index: 1 });
  await page.getByLabel('Brand').fill('Voltas');
  await page.getByLabel('Model number').fill('185V');
  await page.getByLabel('Upload product pictures').setInputFiles(PICTURE);
  await expect(page.getByAltText('Picture 1')).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Selling price (₹) *').fill('38990');
  await page.getByLabel('MRP (₹)').fill('52990');
  await expect(page.getByText('26% off shown to customers')).toBeVisible();
  await page.getByLabel('Stock (units)').fill('3');
  await page.getByLabel('highlight', { exact: true }).fill('5 Star rating');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add specification group' }).click();
  await page.getByLabel('Row 1 label').fill('Capacity');
  await page.getByLabel('Row 1 value').fill('1.5 Ton');
  await page.getByLabel('box item', { exact: true }).fill('Remote');
  await page.keyboard.press('Enter');
  await page.getByRole('switch', { name: 'Pay on Delivery available' }).click();
  await page.getByRole('button', { name: 'Create product' }).click();

  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('26% off')).toBeVisible();
  await expect(page.getByText('Prepaid only')).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Capacity' })).toBeVisible();
  await expect(page.getByText(/3 units ·\s*Low Stock/)).toBeVisible();

  await page.getByRole('link', { name: 'All products' }).click();
  await page.getByLabel('Search products').fill(name);
  await expect(page.getByRole('link', { name })).toBeVisible();
});

test('Inventory: add a part, restock it, and see the stock history', async ({ page, request }) => {
  const admin = await adminSession(request);
  const name = `E2E Capacitor ${randomUUID().slice(0, 6)}`;
  await signIn(page, admin);
  await page.goto('/super-admin/inventory');
  await expect(page.getByText('Stock value (cost)')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('link', { name: 'Add part' }).click();

  await page.getByLabel('Part name *').fill(name);
  await page.getByLabel('Part number').fill('CAP-45');
  await page.getByLabel('Main appliance *').selectOption('AC');
  await page.getByLabel('Cost price (₹) *').fill('200');
  await page.getByLabel('Markup %').fill('50');
  await expect(page.getByText('₹300').first()).toBeVisible();
  await page.getByLabel('Opening stock').fill('4');
  await page.getByLabel('Storage bin').fill('Rack A-1');
  await page.getByRole('button', { name: 'Add part' }).click();

  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Restock' }).click();
  const dialog = page.getByRole('dialog', { name: 'Restock' });
  await dialog.getByLabel(/Quantity/).fill('10');
  await dialog.getByLabel('Reason').fill('PO 7781');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'PO 7781' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '+10' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Opening stock' }).first()).toBeVisible();
  await expect(page.getByText('14', { exact: true }).first()).toBeVisible();
});
