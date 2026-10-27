import { test, expect } from '@playwright/test';
import { offeringBookingBody } from '../catalogueFixture.js';

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

async function signIn(page, session) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Customer Booking Cancellation', () => {
  test('customer can cancel an active booking from the bookings list with a reason', async ({ page, request }) => {
    const customer = await signedInCustomer(request);

    // Create a booking via API
    const createRes = await request.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
      data: await offeringBookingBody(request, {
        api: API,
        offeringCode: 'AC-WINDOW-REPAIR',
        scheduledDate: new Date().toISOString(),
        timeSlot: { date: 'Today', time: '10:00 AM - 01:00 PM' },
        address: {
          house: 'Flat 101, Lakeview Apt',
          area: 'Vijay Nagar',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010',
        },
      }),
    });
    expect(createRes.status()).toBe(201);
    const { booking } = (await createRes.json()).data;
    const humanId = booking.humanId;

    await signIn(page, customer);
    await page.goto('/my-bookings');

    // Find the booking card
    await expect(page.getByText(humanId)).toBeVisible({ timeout: 10_000 });

    // Cancelling happens on the booking's details page: open the card, then "Cancel Booking".
    await page.getByText(humanId).first().click();
    await expect(page).toHaveURL(new RegExp(`/bookings/${humanId}`));
    const cancelBtn = page.getByRole('button', { name: /^Cancel Booking$/i });
    await expect(cancelBtn).toBeVisible({ timeout: 10_000 });
    await cancelBtn.click();

    // Verify cancellation modal is open
    await expect(page.getByRole('heading', { name: /Cancel Booking/i })).toBeVisible();
    await expect(page.getByText(/Reason for Cancellation/i)).toBeVisible();

    // Select reason: "Waiting time too long / Delay in service"
    const delayReason = page.getByRole('button', { name: /Waiting time too long/i });
    await delayReason.click();

    // Click "Yes, Cancel Booking" button
    const confirmCancelBtn = page.getByRole('button', { name: /Yes, Cancel Booking/i });
    await confirmCancelBtn.click();

    // Confirmation appears and the booking shows as cancelled
    await expect(page.getByText(/Booking cancelled successfully/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Cancelled').first()).toBeVisible();

    // Back in My Bookings, the Cancelled tab lists it
    await page.goto('/my-bookings');
    await page.getByRole('button', { name: /Cancelled/i }).first().click();
    await expect(page.getByText(humanId)).toBeVisible();
  });

  test('customer can cancel booking from the searching partner screen', async ({ page, request }) => {
    const customer = await signedInCustomer(request);

    // Create an instant booking
    const createRes = await request.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
      data: await offeringBookingBody(request, {
        api: API,
        offeringCode: 'AC-WINDOW-REPAIR',
        isInstant: true,
        address: {
          house: 'House 55',
          area: 'Palasia',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
        },
      }),
    });
    expect(createRes.status()).toBe(201);
    const { booking, serviceRequest } = (await createRes.json()).data;
    const srId = serviceRequest?.id || serviceRequest?._id;
    const bkId = booking?.humanId || booking?.id;

    await signIn(page, customer);
    await page.goto(`/searching-partner?serviceRequestId=${srId}&bookingId=${bkId}`);

    // Verify searching screen is displayed
    await expect(page.getByRole('heading', { name: /Searching for Service Partner/i }).first()).toBeVisible({ timeout: 10_000 });

    // Click "Cancel Booking" button
    const cancelBookingBtn = page.getByRole('button', { name: /^Cancel Booking$/i });
    await expect(cancelBookingBtn).toBeVisible();
    await cancelBookingBtn.click();

    // Cancellation modal is displayed
    await expect(page.getByRole('heading', { name: /Cancel Booking/i })).toBeVisible();

    // Select "Changed my mind"
    await page.getByRole('button', { name: /Changed my mind/i }).click();

    // Confirm cancel
    await page.getByRole('button', { name: /Yes, Cancel Booking/i }).click();

    // Hero updates to Cancelled state
    await expect(page.getByRole('heading', { name: /Booking Cancelled/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/This booking has been cancelled/i)).toBeVisible();

    // Cancel Booking button should no longer be visible
    await expect(page.getByRole('button', { name: /^Cancel Booking$/i })).not.toBeVisible();
  });
});

for (const providerView of ['dashboard', 'active-job']) {
  test(`customer cancellation removes the provider's job live from ${providerView} and creates a notification`, async ({ browser, request }) => {
    const city = `Cancel City ${uniquePhone()}`;
    const providerPhone = uniquePhone();
    await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: providerPhone, password: 'password123', specs: ['AC'], availability: 'Available', serviceCityName: city } });
    const provider = await verifyOtp(request, 'service_provider', providerPhone);
    const customer = await signedInCustomer(request);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signIn(page, provider);
    await page.goto('/service-provider/dashboard');
    await expect(page.getByText(/Online · Accepting jobs/)).toBeVisible();
    const created = await request.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
      data: await offeringBookingBody(request, { api: API, offeringCode: 'AC-WINDOW-REPAIR', address: { house: 'Cancellation test', city, pincode: '452001' }, fullName: 'Customer Cancellation Test' }),
    });
    expect(created.status()).toBe(201);
    const { booking, serviceRequest } = (await created.json()).data;
    const offer = page.getByRole('dialog');
    await expect(offer).toBeVisible();
    await offer.getByRole('button', { name: /Accept job/i }).click();
    await expect(page.getByRole('button', { name: '1 Active jobs' })).toBeVisible();
    if (providerView === 'active-job') {
      await page.getByRole('button', { name: 'Start Job' }).click();
      await expect(page).toHaveURL(/\/service-provider\/active-job/);
      await page.getByRole('button', { name: 'Start Trip (On My Way)' }).click();
      await expect(page.getByRole('button', { name: 'Mark as Inspection Arrived' })).toBeVisible();
    }
    const adminEmail = `cancel-admin-${uniquePhone()}@e2e.test`;
    await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
    const admin = await verifyOtp(request, 'super_admin', adminEmail);
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, admin);
    await adminPage.goto('/super-admin/assignment');
    await adminPage.getByRole('button', { name: /Active \/ In Progress/ }).click();
    await expect(adminPage.getByText(serviceRequest.humanId, { exact: true })).toBeVisible();
    // The customer uses the real cancellation modal in a separate session.
    const customerPage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await signIn(customerPage, customer);
    await customerPage.goto(`/bookings/${booking.humanId}`);
    await customerPage.getByRole('button', { name: /^Cancel Booking$/i }).click();
    await customerPage.getByRole('button', { name: /Changed my mind/i }).click();
    await customerPage.getByRole('button', { name: /Yes, Cancel Booking/i }).click();
    await expect(customerPage.getByText(/Booking cancelled successfully/i)).toBeVisible();
    await expect(page).toHaveURL(/\/service-provider\/dashboard$/);
    await expect(page.getByRole('button', { name: '0 Active jobs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Job', exact: true })).toHaveCount(0);
    const notice = page.getByRole('alertdialog', { name: 'Customer Cancelled Booking' });
    await expect(notice).toBeVisible();
    await expect(notice.getByText(/Reason: Changed my mind/)).toBeVisible();
    await notice.getByRole('button', { name: 'Understood' }).click();
    await expect(adminPage.getByText(serviceRequest.humanId, { exact: true })).toHaveCount(0);
    await adminPage.goto('/super-admin/requests');
    await adminPage.getByPlaceholder('Search Ticket, Customer, Brand...').fill(serviceRequest.humanId);
    await adminPage.getByRole('combobox').first().selectOption({ label: 'Cancelled' });
    await expect(adminPage.getByText(serviceRequest.humanId, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('ncc_service_provider_active_job'))).toBeNull();
    const headers = { Authorization: `Bearer ${provider.accessToken}` };
    const active = await request.get(`${API}/service-provider/jobs/active`, { headers });
    expect((await active.json()).data).toEqual([]);
    const notifications = (await (await request.get(`${API}/notifications`, { headers })).json()).data;
    expect(notifications.some(item => item.title === 'Job cancelled by customer' && item.message.includes(booking.humanId))).toBe(true);
    await page.reload();
    await expect(page.getByRole('button', { name: '0 Active jobs' })).toBeVisible();
    await adminContext.close();
    await customerPage.context().close();
    await context.close();
  });
}

test('assignment queue excludes completed and cancelled parents even when the service request status is stale', async ({ page, request }) => {
  const email = `cancel-queue-${uniquePhone()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  await signIn(page, await verifyOtp(request, 'super_admin', email));
  const base = { category: 'AC', serviceProvider: { id: 'provider', name: 'Test Provider' }, user: { name: 'Test Customer' } };
  const items = [
    { ...base, id: 'completed', humanId: 'SR-COMPLETED', status: 'Customer Confirmation', booking: { status: 'Completed' }, job: { activeStep: 'completed' } },
    { ...base, id: 'cancelled', humanId: 'SR-CANCELLED', status: 'Engineer Accepted', booking: { status: 'Cancelled' }, job: { activeStep: 'cancelled' } },
    { ...base, id: 'active', humanId: 'SR-ACTIVE', status: 'Engineer Reached', booking: { status: 'Ongoing' }, job: { activeStep: 'inspection' } },
  ];
  await page.route('**/api/v1/service-requests?*', route => route.fulfill({ json: { data: items, error: null, meta: {} } }));
  await page.goto('/super-admin/assignment');
  await page.getByRole('button', { name: 'Active / In Progress (1)', exact: true }).click();
  await expect(page.getByText('SR-ACTIVE', { exact: true })).toBeVisible();
  await expect(page.getByText('SR-COMPLETED', { exact: true })).toHaveCount(0);
  await expect(page.getByText('SR-CANCELLED', { exact: true })).toHaveCount(0);
});
