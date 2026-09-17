import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

async function otpFor(request, identifier) {
  const res = await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return (await res.json()).data.code;
}

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = await otpFor(request, identifier);
  const res = await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } });
  return (await res.json()).data;
}

async function signedInCustomer(request) {
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  return verifyOtp(request, 'customer', phone);
}

async function superAdminToken(request) {
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  return (await verifyOtp(request, 'super_admin', email)).accessToken;
}

async function createActiveCity(request, name, state) {
  const token = await superAdminToken(request);
  await request.post(`${API}/super-admin/cities`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, state, district: name, status: 'Active' },
  });
}

async function signIn(page, session) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

test.use({ viewport: { width: 390, height: 844 } });

test('price is not shown on Step 1, and only appears in Step 2 after a service is selected', async ({ page, request }) => {
  const customer = await signedInCustomer(request);
  await signIn(page, customer);

  await page.goto('/book/AC');

  // Step 1: "Select AC Type"
  await expect(page.getByRole('heading', { name: /Select AC Type/i })).toBeVisible({ timeout: 15_000 });

  // Select a product type (Split AC)
  await page.getByText('Split AC').click();

  // In Step 1, the sticky bottom bar should NOT display any price (no ₹299 or any other price)
  const bottomBar = page.locator('.fixed.bottom-0');
  await expect(bottomBar).toBeVisible();
  await expect(bottomBar.getByText(/₹/)).toHaveCount(0);

  // CTA button should be enabled to go to Step 2
  const continueBtn = bottomBar.getByRole('button', { name: /Continue — Select Service/i });
  await expect(continueBtn).toBeEnabled();
  await continueBtn.click();

  // Step 2: "Select Service Option"
  await expect(page.getByRole('heading', { name: /Select Service Option/i })).toBeVisible();

  // Before selecting a service in Step 2, bottom bar should not have a price
  await expect(bottomBar.getByText(/₹/)).toHaveCount(0);

  // Click an available service card (e.g. AC repair Standard Work or Installation)
  const serviceCard = page.getByRole('button', { name: /(AC repair|Installation|Standard Work)/i }).first();
  await serviceCard.click();

  // Now the selected price must be visible in the bottom bar
  await expect(bottomBar.getByText(/₹(299|499|649)/)).toBeVisible();
});

test('desktop view hides price on Step 1 and shows dynamic price in sidebar on Step 2 after selection', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const customer = await signedInCustomer(request);
  await signIn(page, customer);

  await page.goto('/book/AC');
  await expect(page.getByRole('heading', { name: /Select AC Type/i })).toBeVisible({ timeout: 15_000 });

  // On Step 1, desktop pricing breakdown should show notice, not hardcoded ₹299
  await expect(page.getByText('Service pricing will appear once you select a service package in Step 2.')).toBeVisible();
  await expect(page.locator('text=Total Estimate')).toHaveCount(0);

  // Select Split AC and click continue
  await page.getByText('Split AC').click();
  await page.getByRole('button', { name: /Continue — Select Service/i }).click();

  // On Step 2 before selecting:
  await expect(page.getByRole('heading', { name: /Select Service Option/i })).toBeVisible();
  await expect(page.getByText('Select a service package above to view estimated pricing.')).toBeVisible();

  // Select service package
  await page.getByRole('button', { name: /(AC repair|Installation|Standard Work)/i }).first().click();

  // Now Total Estimate appears in the desktop sidebar
  await expect(page.locator('text=Total Estimate')).toBeVisible();
  await expect(page.getByText(/₹(299|499|649)/).first()).toBeVisible();
});

test('saved address with empty landmark/pincode enables payment button immediately in Step 4', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createActiveCity(request, 'Indore', 'Madhya Pradesh');
  const customer = await signedInCustomer(request);
  // Add a saved address with no landmark and no pincode, just like the real user
  const addrRes = await request.post(`${API}/auth/addresses`, {
    headers: { Authorization: `Bearer ${customer.accessToken}` },
    data: {
      type: 'Home',
      house: 'Saved Apartment 402',
      landmark: '',
      city: 'Indore',
      pincode: '',
      isDefault: true,
    },
  });
  const savedAddrs = (await addrRes.json()).data;
  customer.user.addresses = savedAddrs;

  await signIn(page, customer);
  await page.goto('/book/AC');

  // Step 1: Select Type
  await expect(page.getByRole('heading', { name: /Select AC Type/i })).toBeVisible({ timeout: 15_000 });
  await page.getByText('Split AC').click();
  await page.getByRole('button', { name: /Continue — Select Service/i }).click();

  // Step 2: Select Service
  await page.getByRole('button', { name: /Repair/i }).first().click();
  await page.getByRole('button', { name: /Continue — Schedule Visit/i }).click();

  // Step 3: Select Brand & Date/Slot
  await page.locator('select').first().selectOption('Voltas');
  await page.getByText(/Service Needed Now/i).click();
  await page.getByRole('button', { name: /Continue — Address & Payment/i }).click();

  // Step 4: Address & Payment
  await expect(page.getByRole('heading', { name: /Address & Payment/i })).toBeVisible();

  // Saved address should be selected
  await expect(page.getByText('Saved Apartment 402').first()).toBeVisible();

  // Payment button MUST be active immediately (not "Enter Address & Mobile Details")
  const payBtn = page.getByRole('button', { name: /Pay ₹199 & Confirm Booking/i });
  await expect(payBtn).toBeVisible();
  await expect(payBtn).toBeEnabled();
});


