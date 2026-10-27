import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// docs/brand-crm Phase 2 in the browser: a Customer Care Executive sees only
// the menus their role allows and gets a Forbidden page on a direct URL; the
// Brand Super Admin edits a role's permissions in the module × action matrix,
// and the change reaches the holder of that role.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const SHOTS = fileURLToPath(new URL('../../docs/brand-crm/screenshots/', import.meta.url));
fs.mkdirSync(SHOTS, { recursive: true });

async function session(request, role, identifier) {
  const loginRes = await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  expect(loginRes.status()).toBe(200);
  if (role === 'customer' || role === 'service_provider') return (await loginRes.json()).data;
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}

async function signIn(page, s, portal) {
  await page.addInitScript(([a, r, u, p]) => {
    const suffix = p ? `_${p}` : '';
    localStorage.setItem(`ncc_access_token${suffix}`, a);
    localStorage.setItem(`ncc_refresh_token${suffix}`, r);
    if (u) localStorage.setItem(`ncc_user${suffix}`, u);
  }, [s.accessToken, s.refreshToken, s.user ? JSON.stringify(s.user) : '', portal || '']);
}

async function call(request, method, path, token, data) {
  const res = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`${method.toUpperCase()} ${path} → ${res.status()}: ${JSON.stringify(body.error)}`);
  return body.data;
}

test('a CCE sees only their menus; the owner edits a role in the permission matrix', async ({ browser, request }) => {
  const tag = randomUUID().slice(0, 8);
  const adminEmail = `rbac-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const admin = (await session(request, 'super_admin', adminEmail)).accessToken;
  const brand = await call(request, 'post', '/super-admin/brands', admin, { name: `RBAC Brand ${tag}`, status: 'Active' });

  const ownerEmail = `rbac-owner-${tag}@e2e.test`;
  const cceEmail = `rbac-cce-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email: ownerEmail, password: 'password123', brand: brand.id, employeeId: 'OWN-1' } });
  await request.post(`${API}/_dev/test-user`, {
    data: { role: 'brand_admin', email: cceEmail, password: 'password123', brand: brand.id, brandRoleTemplate: 'cce', employeeId: 'CC-14' },
  });
  const owner = await session(request, 'brand_admin', ownerEmail);
  const cce = await session(request, 'brand_admin', cceEmail);

  // ── The CCE ──
  const cceCtx = await browser.newContext();
  await signIn(cceCtx, cce, 'brand_admin');
  const page = await cceCtx.newPage();
  await page.goto('/brand-admin/warranty-claims');
  const nav = page.locator('nav');
  await expect(nav.getByRole('link', { name: 'All Tickets' })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Invoices/ })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: /Call Rates/ })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: /User & Role/ })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
  await expect(nav.getByText('Finance & Billing')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}phase-2-cce-sidebar.png` });

  await page.goto('/brand-admin/call-rates');
  await expect(page.getByRole('alert')).toContainText('You don’t have access to this page');
  await expect(page.getByRole('alert')).toContainText('Customer Care Executive');
  await page.screenshot({ path: `${SHOTS}phase-2-forbidden.png` });
  await page.getByRole('link', { name: 'Go to my workspace' }).click();
  await expect(page).not.toHaveURL(/call-rates/);

  // ── The owner gives CCEs read access to call rates ──
  const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await signIn(ownerCtx, owner, 'brand_admin');
  const ownerPage = await ownerCtx.newPage();
  await ownerPage.goto('/brand-admin/users');
  const ccRow = ownerPage.getByRole('row').filter({ hasText: 'CC-14' });
  await expect(ccRow).toContainText('Customer Care Executive');
  await expect(ownerPage.getByRole('row').filter({ hasText: 'OWN-1' })).toContainText('Brand Super Admin');

  await ownerPage.getByRole('tab', { name: 'Roles & permissions' }).click();
  const cceCard = ownerPage.locator('div.rounded-2xl').filter({ has: ownerPage.getByText('Customer Care Executive', { exact: true }) }).first();
  await cceCard.getByRole('button', { name: 'Edit' }).click();
  const dialog = ownerPage.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: 'Call rates & charges: View call rates' }).check();
  await ownerPage.screenshot({ path: `${SHOTS}phase-2-role-matrix.png` });
  await dialog.getByRole('button', { name: 'Save role' }).click();
  await expect(ownerPage.getByRole('status')).toContainText('Customer Care Executive saved');

  const roles = await call(request, 'get', '/brand/roles', owner.accessToken);
  expect(roles.find((r) => r.template === 'cce').permissions.map((p) => p.key)).toContain('rates:view');

  // The CCE's next page load picks it up — no sign-out needed.
  await page.goto('/brand-admin/call-rates');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('nav').getByRole('link', { name: /Call Rates/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add override/ })).toHaveCount(0); // view only, no rates:edit

  await cceCtx.close();
  await ownerCtx.close();
});

test('duplicate brand-user phone shows a useful error and the form can be corrected', async ({ page, request }) => {
  const tag = randomUUID().slice(0, 8);
  const adminEmail = `rbac-duplicate-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const admin = await session(request, 'super_admin', adminEmail);
  const brand = await call(request, 'post', '/super-admin/brands', admin.accessToken, { name: `Duplicate Test ${tag}`, status: 'Active' });
  const ownerEmail = `rbac-duplicate-owner-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email: ownerEmail, password: 'password123', brand: brand.id, employeeId: `OWNER-${tag}` } });
  const owner = await session(request, 'brand_admin', ownerEmail);
  const phone = `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
  await call(request, 'post', '/brand/users', owner.accessToken, { name: `Existing ${tag}`, email: `existing-${tag}@e2e.test`, phone, password: 'password123' });
  await signIn(page, owner, 'brand_admin');
  await page.goto('/brand-admin/users');
  await page.getByRole('button', { name: 'Add user', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name', { exact: true }).fill(`New Staff ${tag}`);
  await dialog.getByLabel('Email (sign-in)', { exact: true }).fill(`new-staff-${tag}@e2e.test`);
  await dialog.getByLabel('Phone', { exact: true }).fill(phone);
  await dialog.getByLabel('Initial password', { exact: true }).fill('password123');
  await dialog.getByRole('checkbox', { name: 'Customer Care Executive', exact: true }).check();
  await dialog.getByRole('button', { name: 'Add user', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('phone number is already registered');
  await expect(dialog.getByRole('alert')).not.toContainText('E11000');
  await expect(dialog.getByLabel('Full name', { exact: true })).toHaveValue(`New Staff ${tag}`);
  await dialog.getByLabel('Phone', { exact: true }).fill(`8${phone.slice(1)}`);
  await dialog.getByRole('button', { name: 'Add user', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: `New Staff ${tag}` })).toBeVisible();
});
