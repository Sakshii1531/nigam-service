import { test, expect } from '@playwright/test';
import { offeringBookingBody } from '../catalogueFixture.js';

// Super Admin → Job Assignment: a booking nobody has taken is listed as
// waiting; "Assign" shows who can take it (with one-click assign) and why
// everyone else can't.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function login(request, role, identifier) {
  const res = await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  expect(res.status()).toBe(200);
  if (role !== 'super_admin') return (await res.json()).data;
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}

async function book(request, customer, city) {
  const res = await request.post(`${API}/bookings`, {
    headers: { Authorization: `Bearer ${customer.accessToken}` },
    data: await offeringBookingBody(request, { api: API, offeringCode: 'AC-WINDOW-REPAIR', address: { house: 'Assignment test', city, pincode: '452001' }, fullName: 'Assignment Test' }),
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.serviceRequest;
}

test('an admin assigns a waiting booking in one click, and sees why nobody can take another', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const city = `Assign City ${uniquePhone()}`;
  const emptyCity = `Nobody City ${uniquePhone()}`;
  const providerPhone = uniquePhone();
  // Offline, so the booking is not offered automatically and stays waiting.
  const made = await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: providerPhone, password: 'password123', specs: ['AC'], availability: 'Offline', serviceCityName: city } });
  const providerId = (await made.json()).data.serviceProviderId;

  const customerPhone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone: customerPhone, password: 'password123' } });
  const customer = await login(request, 'customer', customerPhone);
  const waiting = await book(request, customer, city);
  const stranded = await book(request, customer, emptyCity);

  const email = `assign-admin-${uniquePhone()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await login(request, 'super_admin', email);
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token_super_admin', a);
    localStorage.setItem('ncc_refresh_token_super_admin', r);
    localStorage.setItem('ncc_user_super_admin', u);
  }, [admin.accessToken, admin.refreshToken, JSON.stringify(admin.user)]);

  await page.goto('/super-admin/assignment');
  const list = page.getByRole('list', { name: 'Bookings waiting for a partner' });
  const card = list.getByRole('listitem').filter({ hasText: waiting.humanId });
  await expect(card).toBeVisible({ timeout: 15_000 });

  // A booking nobody can take explains why.
  const strandedCard = list.getByRole('listitem').filter({ hasText: stranded.humanId });
  await strandedCard.getByRole('button', { name: 'Assign' }).click();
  await expect(strandedCard.getByText('No partner can take this booking')).toBeVisible();
  await expect(strandedCard.getByRole('list', { name: "Partners who can't take this booking" })).toContainText(`Does not serve ${emptyCity}`);
  await strandedCard.getByRole('button', { name: 'Close' }).click();

  // The waiting booking lists the one partner who can take it; one click assigns.
  await card.getByRole('button', { name: 'Assign' }).click();
  await expect(card.getByText(/Assign within \d+ min/)).toBeVisible();
  const able = card.getByRole('list', { name: `Partners who can take ${waiting.humanId}` });
  await expect(able.getByRole('listitem')).toHaveCount(1);
  await able.getByRole('button', { name: `Assign E2E Test ServiceProvider to ${waiting.humanId}` }).click();
  await expect(page.getByRole('status')).toContainText(`${waiting.humanId} offered to E2E Test ServiceProvider`);

  const after = (await (await request.get(`${API}/service-requests/${waiting.id}`, { headers: { Authorization: `Bearer ${admin.accessToken}` } })).json()).data;
  expect(String(after.serviceProvider?.id || after.serviceProvider?._id || after.serviceProvider)).toBe(providerId);
  await expect(card.getByText('Offered to E2E Test ServiceProvider, waiting for them to accept')).toBeVisible();
});
