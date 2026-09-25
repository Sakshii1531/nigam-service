import { test, expect } from '@playwright/test';
import { offeringBookingBody } from '../catalogueFixture.js';

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const otpRes = await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`);
  const code = (await otpRes.json()).data.code;
  const res = await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } });
  return (await res.json()).data;
}

async function signIn(page, session) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

/**
 * An online provider in a city of their own, so auto-assignment can only pick
 * them — other specs share this database and their providers must not win the job.
 */
async function onlineProviderInOwnCity(request) {
  const city = `E2E City ${Math.random().toString(36).slice(2, 8)}`;
  const phone = uniquePhone();
  const created = await request.post(`${API}/_dev/test-serviceProvider`, {
    data: { phone, password: 'password123', specs: ['AC'], availability: 'Available', serviceCityName: city },
  });
  expect(created.status()).toBe(201);
  const session = await verifyOtp(request, 'service_provider', phone);
  return { city, session };
}

async function customerBooking(request, city) {
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = await verifyOtp(request, 'customer', phone);
  const res = await request.post(`${API}/bookings`, {
    headers: { Authorization: `Bearer ${customer.accessToken}` },
    data: await offeringBookingBody(request, {
      api: API,
      offeringCode: 'AC-WINDOW-REPAIR',
      isInstant: true,
      fullName: 'E2E Dispatch Customer',
      address: { house: '7 Test Lane', city, pincode: '452001' },
    }),
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

test.use({ viewport: { width: 390, height: 844 } });

test('dashboard shows real partner data instead of the old hardcoded score', async ({ page, request }) => {
  const { session } = await onlineProviderInOwnCity(request);
  await signIn(page, session);
  await page.goto('/service-provider/dashboard');

  await expect(page.getByRole('button', { name: /Online · Accepting jobs/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/ELITE PARTNER/i)).toHaveCount(0);
  // Stats are real counts for a brand-new partner, not a made-up score.
  await expect(page.getByRole('button', { name: '0 New offers' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: '0 Done today' })).toBeVisible();

  // The rating lives on the history page and says so honestly when there is none.
  await page.goto('/service-provider/history');
  await expect(page.getByText('No ratings yet')).toBeVisible({ timeout: 15_000 });
});

test('an online provider gets the job pop-up with real earnings, can accept it, and sees it in history', async ({ page, request }) => {
  const { city, session } = await onlineProviderInOwnCity(request);
  await signIn(page, session);
  await page.goto('/service-provider/dashboard');
  await expect(page.getByText(/Online · Accepting jobs/)).toBeVisible({ timeout: 15_000 });

  const { serviceRequest } = await customerBooking(request, city);
  expect(serviceRequest.serviceProvider).toBeTruthy();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText(/New job for you/i)).toBeVisible();
  await expect(dialog.getByText('You earn')).toBeVisible();
  await expect(dialog.getByText(/^₹\d/).first()).toBeVisible();
  await expect(dialog.getByText('E2E Dispatch Customer')).toBeVisible();
  // Assigned offers carry the 60s response countdown.
  await expect(dialog.getByLabel(/seconds left to respond/)).toBeVisible();

  await dialog.getByRole('button', { name: /Accept job/i }).click();
  // Accepting keeps the partner on the dashboard and lists the job under Active Jobs.
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: '1 Active jobs' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Start Job' })).toBeVisible();

  await page.goto('/service-provider/history');
  await expect(page.getByRole('heading', { name: 'Service History' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('E2E Dispatch Customer', { exact: false })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('In progress').first()).toBeVisible();
});

test('declining the pop-up releases the job and closes the pop-up', async ({ page, request }) => {
  const { city, session } = await onlineProviderInOwnCity(request);
  await signIn(page, session);
  await page.goto('/service-provider/dashboard');
  await expect(page.getByText(/Online · Accepting jobs/)).toBeVisible({ timeout: 15_000 });

  const { serviceRequest } = await customerBooking(request, city);

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('button', { name: /^Decline$/ }).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });

  // The pop-up closes straight away; the decline request lands just after.
  // Once it has, the request is gone from this provider's feed for good.
  await expect
    .poll(async () => {
      const offers = await request.get(`${API}/service-provider/jobs/available`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      return (await offers.json()).data.some((o) => o.id === serviceRequest.id);
    }, { timeout: 10_000 })
    .toBe(false);
});
