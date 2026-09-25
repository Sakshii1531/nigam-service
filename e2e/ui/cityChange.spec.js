import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Service city changes: the provider asks from their app, an admin decides in
// the panel; or a super-admin changes the city directly from the provider's
// profile.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const otp = await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`);
  const code = (await otp.json()).data.code;
  const res = await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } });
  return (await res.json()).data;
}

async function superAdminSession(request) {
  const email = `city-change-ui-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  return verifyOtp(request, 'super_admin', email);
}

async function createCity(request, token, name) {
  const res = await request.post(`${API}/super-admin/cities`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, state: 'E2E State', status: 'Active' },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

async function providerIn(request, city) {
  const phone = uniquePhone();
  const res = await request.post(`${API}/_dev/test-serviceProvider`, {
    data: { phone, password: 'password123', availability: 'Offline', city: city.id, serviceCityName: city.name, serviceStateName: city.state },
  });
  expect(res.status()).toBe(201);
  const { serviceProviderId } = (await res.json()).data;
  return { serviceProviderId, session: await verifyOtp(request, 'service_provider', phone) };
}

async function signIn(page, session, portal) {
  await page.addInitScript(([a, r, u, p]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
    if (p) {
      localStorage.setItem(`ncc_access_token_${p}`, a);
      localStorage.setItem(`ncc_refresh_token_${p}`, r);
      localStorage.setItem(`ncc_user_${p}`, u);
    }
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user), portal]);
}

async function providerCity(request, session) {
  const res = await request.get(`${API}/service-provider/profile/profile`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const profile = (await res.json()).data;
  return profile.serviceCityName;
}

async function setup(request) {
  const admin = await superAdminSession(request);
  const suffix = randomUUID().slice(0, 6);
  const from = await createCity(request, admin.accessToken, `E2E From ${suffix}`);
  const to = await createCity(request, admin.accessToken, `E2E To ${suffix}`);
  const provider = await providerIn(request, from);
  return { admin, from, to, provider };
}

async function requestFromApp(browser, provider, to) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await signIn(page, provider.session);
  await page.goto('/service-provider/personal-info');

  // The profile section is headed "Service Territory" (it was "Service City").
  await expect(page.getByText('Service Territory')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Request change' }).click();
  const sheet = page.getByRole('dialog', { name: 'Request Territory Transfer' });
  await sheet.getByRole('combobox').selectOption({ label: `${to.name}, ${to.state}` });
  await sheet.getByPlaceholder(/Relocated residence/).fill('Moved house');
  await sheet.getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByText('Pending Admin Approval')).toBeVisible();
  await expect(page.getByText(`${to.name}, ${to.state}`)).toBeVisible();
  return { context, page };
}

test('provider requests a city change in the app and a super-admin approves it', async ({ browser, request }) => {
  const { admin, from, to, provider } = await setup(request);
  const { context: providerContext, page: providerPage } = await requestFromApp(browser, provider, to);
  expect(await providerCity(request, provider.session)).toBe(from.name);

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, admin, 'super_admin');
  await adminPage.goto('/super-admin/city-change-requests');

  const card = adminPage.locator('div.rounded-2xl', { hasText: 'Moved house' }).filter({ hasText: to.name }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole('button', { name: 'Approve' }).click();
  const dialog = adminPage.getByRole('dialog', { name: 'Approve city change?' });
  await dialog.getByRole('button', { name: 'Approve' }).click();
  await expect(adminPage.getByRole('status')).toContainText(`now serves ${to.name}`);

  await expect.poll(() => providerCity(request, provider.session)).toBe(to.name);

  await providerPage.reload();
  await expect(providerPage.getByText(`Your transfer to ${to.name} was approved!`)).toBeVisible({ timeout: 15_000 });
  await expect(providerPage.getByText('Pending Admin Approval')).toHaveCount(0);

  await providerContext.close();
  await adminContext.close();
});

test('a rejection needs a reason, and the provider sees it while keeping their city', async ({ browser, request }) => {
  const { admin, from, to, provider } = await setup(request);
  const { context: providerContext, page: providerPage } = await requestFromApp(browser, provider, to);

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, admin, 'super_admin');
  await adminPage.goto('/super-admin/city-change-requests');

  const card = adminPage.locator('div.rounded-2xl', { hasText: 'Moved house' }).filter({ hasText: to.name }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole('button', { name: 'Reject' }).click();
  const dialog = adminPage.getByRole('dialog', { name: 'Reject city change?' });
  await dialog.getByRole('button', { name: 'Reject' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Tell the service provider why');
  await dialog.getByRole('textbox').fill('That city is fully staffed right now');
  await dialog.getByRole('button', { name: 'Reject' }).click();
  await expect(adminPage.getByRole('status')).toContainText('rejected');

  expect(await providerCity(request, provider.session)).toBe(from.name);
  await providerPage.reload();
  await expect(providerPage.getByText(`Your transfer request to ${to.name} was not approved.`)).toBeVisible({ timeout: 15_000 });
  await expect(providerPage.getByText('That city is fully staffed right now')).toBeVisible();

  await providerContext.close();
  await adminContext.close();
});

test('a super-admin changes the service city directly from the provider profile', async ({ page, request }) => {
  const { admin, from, to, provider } = await setup(request);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, admin, 'super_admin');
  await page.goto('/super-admin/service-providers');

  // Fixture providers share a name; the city name is unique to this test.
  const row = page.locator('tr', { hasText: from.name });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByTitle('View Profile').click();

  await page.getByRole('button', { name: 'Change', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Change service city' });
  await dialog.getByRole('combobox').selectOption({ label: `${to.name}, ${to.state}` });
  await dialog.getByRole('textbox').fill('Needed there this month');
  await dialog.getByRole('button', { name: 'Change city' }).click();

  await expect(dialog).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText(`now serves ${to.name}`)).toBeVisible();
  await expect.poll(() => providerCity(request, provider.session)).toBe(to.name);
});
