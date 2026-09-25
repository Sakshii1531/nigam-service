import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// The client's Master Catalogue acceptance tests walked in the browser
// (docs/master-catalogue Phase 7): customer Tests 1, 4, 5, 6, 10 on the
// seeded catalogue, and the admin side of Test 8. The API-level versions of
// all 12 are backend/tests/clientAcceptance.test.js.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}

async function signInCustomer(page, request) {
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const s = await verifyOtp(request, 'customer', phone);
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [s.accessToken, s.refreshToken, JSON.stringify(s.user)]);
}

async function superAdmin(request) {
  const email = `catalogue-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  return verifyOtp(request, 'super_admin', email);
}

const bottomBar = (page) => page.locator('.fixed.bottom-0');

test.describe('customer booking flow on the Master Catalogue', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Test 1: Split AC Installation → ₹1,499', async ({ page, request }) => {
    await signInCustomer(page, request);
    await page.goto('/book/AC');
    await page.getByText('Split AC').click();
    await page.getByRole('button', { name: /^1\.5 Ton/ }).click();
    await page.getByRole('button', { name: /Continue — Select Service/ }).click();
    const install = page.getByRole('button', { name: /Installation/ }).first();
    await expect(install).toContainText('₹1,499');
    await install.click();
    await expect(bottomBar(page).getByText('₹1,768.82')).toBeVisible();
  });

  test('Test 4: LED TV 55–65" Installation → ₹799, ₹349 never appears', async ({ page, request }) => {
    await signInCustomer(page, request);
    await page.goto('/book/TV');
    await page.getByText('LED TV').first().click();
    await page.getByRole('button', { name: /^55–65 inch/ }).click();
    await page.getByRole('button', { name: /Continue — Select Service/ }).click();
    await page.getByRole('button', { name: /Installation/ }).first().click();
    await expect(bottomBar(page).getByText('₹942.82')).toBeVisible();
    await expect(page.getByText(/₹349\b/)).toHaveCount(0);
  });

  test('Test 5: Fan Installation — standalone, no product step', async ({ page, request }) => {
    await signInCustomer(page, request);
    await page.goto('/book/Electrician');
    await expect(page.getByText(/Select .* Type/)).toHaveCount(0);
    await page.getByRole('button', { name: /Fan Installation/ }).click();
    await page.getByRole('button', { name: /Continue — Select Service/ }).click();
    await expect(page.getByRole('heading', { name: 'Confirm Service' })).toBeVisible();
    await expect(bottomBar(page).getByText('₹352.82')).toBeVisible();
  });

  test('Test 6: Water Tank Cleaning — each tank size shows its own price', async ({ page, request }) => {
    await signInCustomer(page, request);
    await page.goto(`/book/${encodeURIComponent('Water Tank Sump Cleaning')}`);
    await page.getByRole('button', { name: /Water Tank Cleaning Drain/ }).click();
    const sizes = page.getByRole('group', { name: /Tank|Capacity|Size|Option/i });
    for (const price of ['₹499', '₹699', '₹999', '₹1,499']) await expect(sizes.getByText(price)).toBeVisible();
    await sizes.getByRole('button', { name: /501/ }).click();
    await page.getByRole('button', { name: /Continue — Select Service/ }).click();
    await expect(bottomBar(page).getByText('₹824.82')).toBeVisible();
  });

  test('Test 10: search → Fan × 2 → the same ₹705.64 on every step', async ({ page, request }) => {
    await signInCustomer(page, request);
    await page.goto('/dashboard');
    await page.getByRole('searchbox', { name: 'Search for services' }).fill('fan inst');
    await page.getByRole('option', { name: /Fan Installation/ }).click();
    await expect(page).toHaveURL(/\/book\/Electrician\?svc=fan_installation/);

    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(bottomBar(page).getByText('₹705.64')).toBeVisible();
    await page.getByRole('button', { name: /Continue — Schedule Visit/ }).click();
    await page.getByText('Morning', { exact: true }).first().click();
    const dates = page.locator('button').filter({ hasText: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*\d+/ });
    await dates.nth(1).click();
    await expect(page.getByText('₹705.64').locator('visible=true').first()).toBeVisible();
    await page.getByRole('button', { name: /Continue — Address & Payment/ }).click();
    await page.getByRole('button', { name: /Pay After Service/ }).first().click();
    await expect(page.getByRole('button', { name: /Total Payable/ })).toContainText('₹705.64');
  });
});

test.describe('super admin', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Test 8: changing the customer price keeps the payout; history shows it; margin report opens', async ({ page, request }) => {
    const admin = await superAdmin(request);
    await page.addInitScript(([a, r]) => {
      localStorage.setItem('ncc_access_token_super_admin', a);
      localStorage.setItem('ncc_refresh_token_super_admin', r);
    }, [admin.accessToken, admin.refreshToken]);

    const auth = { Authorization: `Bearer ${admin.accessToken}` };
    const tvOffering = async () =>
      (await (await request.get(`${API}/super-admin/catalogue/offerings?q=TV-LED-55-65-INSTALL`, { headers: auth })).json()).data[0];
    // Other UI specs (and Test 4 above) expect the seeded ₹799: start from it, and put it back after.
    const setPrice = async (customerPrice, reason) => {
      const offering = await tvOffering();
      if (offering.rate.customerPrice !== customerPrice) {
        await request.post(`${API}/super-admin/catalogue/offerings/${offering.id}/rates`, { headers: auth, data: { customerPrice, reason } });
      }
    };
    await setPrice(799, 'Reset before e2e');

    try {
      await page.goto('/super-admin/dashboard');
      await page.getByRole('link', { name: 'Master Catalogue' }).click();
      await expect(page).toHaveURL(/\/super-admin\/service-catalog/);
      await page.getByRole('navigation', { name: 'Categories' }).getByRole('button', { name: /^TV\s*\d/ }).click();
      await page.getByRole('button', { name: 'Change price for TV-LED-55-65-INSTALL' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Change price / payout' });
      await dialog.getByLabel(/Customer price/).fill('899');
      await dialog.getByLabel(/Reason/).fill('Festive pricing (e2e)');
      await dialog.getByRole('button', { name: 'Save new rate' }).click();
      await dialog.waitFor({ state: 'detached' });

      await page.getByRole('button', { name: 'Edit TV-LED-55-65-INSTALL' }).first().click();
      await page.getByRole('tab', { name: 'History' }).click();
      await expect(page.getByText('Festive pricing (e2e)').first()).toBeVisible();

      // The partner payout did not move with the price.
      expect((await tvOffering()).rate).toMatchObject({ customerPrice: 899, spPayout: 450 });

      await page.keyboard.press("Escape");
      await page.getByRole("link", { name: /^Revenue/ }).first().click();
      await expect(page).toHaveURL(/\/super-admin\/revenue/);
      await expect(page.getByRole('tab', { name: 'Service Margin', selected: true })).toBeVisible();
      await expect(page.getByText('Revenue ex-GST').first()).toBeVisible();
    } finally {
      await setPrice(799, 'Restore after e2e');
    }
  });
});
