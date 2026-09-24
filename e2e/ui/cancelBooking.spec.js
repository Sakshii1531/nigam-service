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

    // Click "Cancel" button on the card
    const cancelBtn = page.getByRole('button', { name: /^Cancel$/i }).first();
    await expect(cancelBtn).toBeVisible();
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

    // Toast message appears
    await expect(page.getByText(/Booking has been cancelled successfully/i)).toBeVisible({ timeout: 10_000 });

    // Status on card updates to Cancelled
    await expect(page.getByText('Cancelled').first()).toBeVisible();

    // In Cancelled tab, the booking is listed
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
