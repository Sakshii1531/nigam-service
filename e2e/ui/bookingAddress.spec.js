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
  const loginRes = await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  expect(loginRes.status()).toBe(200);
  if (role === 'customer' || role === 'service_provider') return (await loginRes.json()).data;
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

async function addAddress(request, customer, data) {
  const res = await request.post(`${API}/auth/addresses`, { headers: { Authorization: `Bearer ${customer.accessToken}` }, data });
  expect(res.status()).toBe(200);
  return (await res.json()).data;
}

async function openAddressStep(page) {
  await page.goto('/book/AC');
  await expect(page.getByRole('heading', { name: /Select AC Type/i })).toBeVisible({ timeout: 15_000 });
  await page.getByText('Split AC').click();
  await page.getByRole('button', { name: /^1\.5 Ton/ }).click();
  await page.getByRole('button', { name: /Continue — Select Service/i }).click();
  await page.getByRole('button', { name: /Repair/i }).first().click();
  await page.getByRole('button', { name: /Continue — Schedule Visit/i }).click();
  await page.getByText(/Service Needed Now/i).click();
  await page.getByRole('button', { name: /Continue — Address & Payment/i }).click();
  await expect(page.getByRole('heading', { name: /Address & Payment/i })).toBeVisible();
}

test('step 4 lists saved addresses to pick from and adds a new one without leaving the booking', async ({ page, request }) => {
  await createActiveCity(request, 'Indore', 'Madhya Pradesh');
  const customer = await signedInCustomer(request);
  await addAddress(request, customer, { type: 'Home', house: '11 First Street', landmark: 'Near Park', city: 'Indore', state: 'Madhya Pradesh', pincode: '452001', isDefault: true });
  customer.user.addresses = await addAddress(request, customer, { type: 'Work', house: '22 Office Tower', city: 'Indore', state: 'Madhya Pradesh', pincode: '452010' });
  await signIn(page, customer);
  await openAddressStep(page);

  const list = page.getByRole('radiogroup', { name: 'Saved addresses' });
  const home = list.getByRole('radio', { name: /11 First Street/ });
  const work = list.getByRole('radio', { name: /22 Office Tower/ });
  await expect(home).toHaveAttribute('aria-checked', 'true');
  // The old always-open form is gone while a saved address is chosen.
  await expect(page.getByLabel('House / Flat / Building')).toHaveCount(0);

  await work.click();
  await expect(work).toHaveAttribute('aria-checked', 'true');
  await expect(home).toHaveAttribute('aria-checked', 'false');

  // Cancel returns to the list with the same choice.
  await page.getByRole('button', { name: 'Add new address' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(work).toHaveAttribute('aria-checked', 'true');

  // Add and save a new address from the booking page.
  await page.getByRole('button', { name: 'Add new address' }).click();
  await page.getByRole('button', { name: 'Save & use this address' }).click();
  await expect(page.getByRole('alert')).toContainText('house / flat');
  await page.getByLabel('House / Flat / Building').fill('33 New Colony');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Area / Landmark').fill('Behind Mall');
  await page.getByLabel('City').fill('Indore');
  await expect(page.getByLabel('State')).toHaveValue('Madhya Pradesh');
  await page.getByLabel('Pincode').fill('452011');
  await page.getByRole('radio', { name: 'Other' }).click();
  await page.getByRole('button', { name: 'Save & use this address' }).click();

  const added = list.getByRole('radio', { name: /33 New Colony/ });
  await expect(added).toHaveAttribute('aria-checked', 'true');
  await expect(work).toHaveAttribute('aria-checked', 'false');
  const saved = (await (await request.get(`${API}/auth/addresses`, { headers: { Authorization: `Bearer ${customer.accessToken}` } })).json()).data;
  expect(saved).toHaveLength(3);
  expect(saved.find((a) => a.house === '33 New Colony')).toMatchObject({ type: 'Other', landmark: 'Behind Mall', city: 'Indore', state: 'Madhya Pradesh', pincode: '452011' });

  // Edit fixes a saved address in place.
  await page.getByRole('button', { name: /Edit Work: 22 Office Tower/ }).click();
  await page.getByLabel('House / Flat / Building').fill('22 Office Tower, Floor 5');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(list.getByRole('radio', { name: /Floor 5/ })).toHaveAttribute('aria-checked', 'true');

  await expect(page.getByRole('button', { name: /Pay ₹[\d,.]+ & Confirm Booking/i })).toBeEnabled();
});

test('a customer with no saved address gets the form straight away', async ({ page, request }) => {
  await createActiveCity(request, 'Indore', 'Madhya Pradesh');
  const customer = await signedInCustomer(request);
  await signIn(page, customer);
  await openAddressStep(page);
  await expect(page.getByRole('radiogroup', { name: 'Saved addresses' })).toHaveCount(0);
  await page.getByLabel('House / Flat / Building').fill('44 Fresh Lane');
  await page.getByLabel('City').fill('Indore');
  await page.getByLabel('Pincode').fill('452001');
  await page.getByRole('button', { name: 'Save & use this address' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Saved addresses' }).getByRole('radio', { name: /44 Fresh Lane/ })).toHaveAttribute('aria-checked', 'true');
});
