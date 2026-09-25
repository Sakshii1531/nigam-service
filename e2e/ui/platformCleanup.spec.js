import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// docs/master-catalogue Phases 13–17 in the browser: the finance page is gone,
// the two Buy pages open, brand-admin money comes from the brand's own data,
// and a category picture uploaded by the admin reaches the customer screens.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const PICTURE = fileURLToPath(new URL('../../frontend/src/assets/categories/split_ac.png', import.meta.url));
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}

async function customerSession(request) {
  const phone = uniquePhone();
  const created = await (await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } })).json();
  return { ...(await verifyOtp(request, 'customer', phone)), id: created.data.id };
}

async function signIn(page, session, portal) {
  await page.addInitScript(([a, r, u, p]) => {
    const suffix = p ? `_${p}` : '';
    localStorage.setItem(`ncc_access_token${suffix}`, a);
    localStorage.setItem(`ncc_refresh_token${suffix}`, r);
    if (u) localStorage.setItem(`ncc_user${suffix}`, u);
  }, [session.accessToken, session.refreshToken, session.user ? JSON.stringify(session.user) : '', portal || '']);
}

test.describe('customer app', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the finance offer page no longer exists', async ({ page, request }) => {
    await signIn(page, await customerSession(request));
    await page.goto('/finance/personal-loan');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Nigam Personal Loan|pre-approved/i)).toHaveCount(0);
  });

  test('Buy → Products & Accessories and All Appliances open (they were unreachable)', async ({ page, request }) => {
    await signIn(page, await customerSession(request));
    await page.goto('/buy/accessories');
    await expect(page.getByText('Spare Parts & Accessories').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('RO Membrane').first()).toBeVisible();
    await page.goto('/buy/all-appliances');
    await expect(page.getByRole('heading', { name: 'All Appliances' }).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('brand admin', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Payments and Dashboard show the brand’s own invoice totals, not fixed numbers', async ({ page, request }) => {
    const brandId = (await (await request.post(`${API}/_dev/test-brand`, { data: { name: `E2E Brand ${randomUUID()}` } })).json()).data.id;
    const email = `brand-${randomUUID()}@e2e.test`;
    await request.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email, password: 'password123', brand: brandId } });
    const admin = await verifyOtp(request, 'brand_admin', email);

    const customer = await customerSession(request);
    const spPhone = uniquePhone();
    const sp = (await (await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: spPhone, password: 'password123', specs: ['AC'] } })).json()).data;
    const srId = (await (await request.post(`${API}/_dev/test-service-request`, {
      data: { customerId: customer.id, serviceProviderId: sp.serviceProviderId, category: 'AC', brand: brandId },
    })).json()).data.id;
    const invoice = (await (await request.post(`${API}/brand/invoices`, {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
      data: { serviceRequest: srId, customer: customer.id, serviceProvider: sp.serviceProviderId, serviceCharge: 500 },
    })).json()).data;
    const rupees = `₹${Number(invoice.total).toLocaleString('en-IN')}`;

    await signIn(page, admin, 'brand_admin');
    await page.goto('/brand-admin/payments');
    await expect(page.getByText('1 unpaid invoice')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(rupees).first()).toBeVisible();
    await expect(page.getByText('₹40,30,020')).toHaveCount(0);

    await page.goto('/brand-admin/dashboard');
    await expect(page.getByText('Financial Overview')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(rupees).first()).toBeVisible();
    await expect(page.getByText('₹48,75,230')).toHaveCount(0);
    await expect(page.getByText('15,230')).toHaveCount(0);
  });
});

test.describe('images through uploads', () => {
  test('an admin uploads a category picture and the AMC appliance list shows it', async ({ browser, request }) => {
    const email = `admin-${randomUUID()}@e2e.test`;
    await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
    const admin = await verifyOtp(request, 'super_admin', email);
    const auth = { Authorization: `Bearer ${admin.accessToken}` };
    const ac = (await (await request.get(`${API}/super-admin/catalogue/categories`, { headers: auth })).json()).data.find((c) => c.key === 'AC');

    const adminPage = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await signIn(adminPage, admin, 'super_admin');
    await adminPage.goto('/super-admin/dashboard');
    await adminPage.getByRole('link', { name: 'Master Catalogue' }).click();
    await adminPage.getByRole('navigation', { name: 'Categories' }).getByRole('button', { name: /^AC\s*\d/ }).click();
    await adminPage.getByRole('button', { name: /Edit category|Edit AC/i }).first().click();
    const dialog = adminPage.getByRole('dialog', { name: 'Edit AC' });
    await dialog.getByLabel('Upload category picture').setInputFiles(PICTURE);
    const preview = dialog.locator('img[src*="/uploads/"], img[src*="cloudinary"]');
    await expect(preview).toBeVisible({ timeout: 15_000 });
    const url = await preview.getAttribute('src');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await dialog.waitFor({ state: 'detached' });

    try {
      const customerPage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
      await signIn(customerPage, await customerSession(request));
      await customerPage.goto('/buy/amc/select-appliance');
      await expect(customerPage.locator(`img[src="${url}"]`).first()).toBeVisible({ timeout: 15_000 });
    } finally {
      // Leave the shared catalogue as other specs expect it.
      await request.put(`${API}/super-admin/catalogue/categories/${ac.id}`, { headers: auth, data: { imageUrl: null } });
    }
  });
});
