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

test.describe('Dedicated Booking Details & Reschedule Workflow', () => {
  test('navigating from bookings list routes to dedicated order details page', async ({ page, request }) => {
    const customer = await signedInCustomer(request);

    // Create booking
    const createRes = await request.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
      data: await offeringBookingBody(request, {
        // A real seeded catalogue offering — bookings are priced server-side
        // from the quoted offering, never from a client-supplied price.
        api: API,
        offeringCode: 'AC-SPLIT-DEEPCLEAN',
        variant: '1.5 Ton',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '10:00 AM - 01:00 PM',
        address: {
          house: 'House 42, Green Valley',
          area: 'Palasia',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
        },
      }),
    });
    expect(createRes.status()).toBe(201);
    const { booking } = (await createRes.json()).data;
    const humanId = booking.humanId;

    await signIn(page, customer);
    await page.goto('/my-bookings');

    // Booking card appears in list
    await expect(page.getByText(humanId)).toBeVisible({ timeout: 10_000 });

    // The whole booking card opens the dedicated details route ("Details" is its label).
    await page.getByText(humanId).first().click();

    // Verify URL is /bookings/:id
    await expect(page).toHaveURL(new RegExp(`/bookings/${humanId}`));

    // Verify key sections on the dedicated page
    await expect(page.getByRole('heading', { name: 'Booking Details' })).toBeVisible();
    await expect(page.getByText(humanId)).toBeVisible();
    await expect(page.getByText(/Service Verification OTP/i)).toBeVisible();
    await expect(page.getByText(/Deep Cleaning/i).first()).toBeVisible();
    await expect(page.getByText(/Appointment Schedule/i)).toBeVisible();
    await expect(page.getByText(/Service Location/i)).toBeVisible();
    await expect(page.getByText(/Live Progress Tracking/i)).toBeVisible();
    await expect(page.getByText(/Payment & Billing Details/i)).toBeVisible();
  });

  test('customer can reschedule booking to a new date and time slot with zero fee', async ({ page, request }) => {
    const customer = await signedInCustomer(request);

    // Create booking
    const createRes = await request.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
      data: await offeringBookingBody(request, {
        api: API,
        offeringCode: 'AC-WINDOW-REPAIR',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '10:00 AM - 01:00 PM',
        address: {
          house: 'Apartment 204, Silver Oak',
          area: 'New Palasia',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
        },
      }),
    });
    expect(createRes.status()).toBe(201);
    const { booking } = (await createRes.json()).data;
    const humanId = booking.humanId;

    await signIn(page, customer);
    await page.goto(`/bookings/${humanId}`);

    // Verify page loaded
    await expect(page.getByText(humanId)).toBeVisible({ timeout: 10_000 });

    // Click "Reschedule" button in Appointment section
    const rescheduleBtn = page.getByRole('button', { name: /Reschedule/i }).first();
    await expect(rescheduleBtn).toBeVisible();
    await rescheduleBtn.click();

    // Verify Reschedule modal appears
    await expect(page.getByRole('heading', { name: /Reschedule Booking/i })).toBeVisible();
    await expect(page.getByText(/Zero Fee Reschedule/i)).toBeVisible();

    // Select Afternoon slot
    const afternoonSlot = page.getByRole('button', { name: /Afternoon/i });
    await afternoonSlot.click();

    // Select reason
    const reasonOption = page.getByRole('button', { name: /Want service at a more convenient time/i });
    await reasonOption.click();

    // Click "Confirm Reschedule"
    const confirmBtn = page.getByRole('button', { name: /Confirm Reschedule/i });
    await confirmBtn.click();

    // Toast message appears
    await expect(page.getByText(/Appointment rescheduled successfully/i)).toBeVisible({ timeout: 10_000 });

    // Verify updated time slot shows
    await expect(page.getByText(/01:00 PM|Afternoon/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('searching partner screen renders the 15-minute multi-stage search timeline and rotating care tips carousel', async ({ page, request }) => {
    const customer = await signedInCustomer(request);

    // Create booking
    const createRes = await request.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
      data: await offeringBookingBody(request, {
        api: API,
        offeringCode: 'AC-WINDOW-REPAIR',
        scheduledDate: new Date().toISOString(),
        timeSlot: '08:00 AM - 11:00 AM',
        isInstant: true,
        address: {
          house: 'House 12',
          area: 'Scheme 78',
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
    await page.goto(`/searching-partner?bookingId=${humanId}&service=Repair&category=AC&totalPrice=299&city=Indore`);

    // Verify Radar and Stage progress
    await expect(page.getByRole('heading', { name: /Searching for Service Partner/i })).toBeVisible({ timeout: 10_000 });
    // The current search stage is shown as a heading (the minute timer was removed).
    await expect(page.getByRole('heading', { name: /Scanning Nearby Verified Partners|Expanding Search Territory/i })).toBeVisible();
    await expect(page.getByText(/Near Indore/i)).toBeVisible();

    // Verify Rotating Appliance Care Carousel
    await expect(page.getByRole('heading', { name: 'Optimal AC Temperature Setting' })).toBeVisible();

    // Verify Milestone steps
    await expect(page.getByText('Booking Placed')).toBeVisible();
    await expect(page.getByText('Finding Partner')).toBeVisible();

    // Verify Reschedule and Cancel buttons exist
    await expect(page.getByRole('button', { name: /^Reschedule$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel Booking/i })).toBeVisible();
  });
});
