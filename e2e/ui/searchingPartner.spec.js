import { test, expect } from '@playwright/test';

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

test('booking confirmation screen displays details and auto-redirects to searching-partner after 5 seconds', async ({ page, request }) => {
  const customer = await signedInCustomer(request);
  await signIn(page, customer);

  const queryParams = new URLSearchParams({
    type: 'service',
    service: 'AC repair Standard Work',
    category: 'AC',
    productType: 'Split AC',
    brand: 'Whirlpool',
    quantity: '1',
    date: 'Today',
    timeGroup: 'Morning',
    totalPrice: '299',
    advanceAmt: '0',
    city: 'Indore',
  }).toString();

  await page.goto(`/booking-success?${queryParams}`);

  // Step 1: Confirmation screen shows confirmed details
  await expect(page.getByRole('heading', { name: /Booking Confirmed!/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('AC repair Standard Work')).toBeVisible();
  await expect(page.getByText('Whirlpool')).toBeVisible();

  // Step 2: Notice banner showing countdown is visible
  await expect(page.getByText(/Searching Service Partner/i).first()).toBeVisible();
  await expect(page.getByText(/Redirecting in/i)).toBeVisible();

  // Step 3: Automatically redirects to /searching-partner within ~6 seconds
  await expect(page).toHaveURL(/\/searching-partner/, { timeout: 8_000 });

  // Step 4: On searching screen, verify partner search elements
  await expect(page.getByRole('heading', { name: /Searching for Service Partner/i }).first()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/Broadcasting your service request/i).or(page.getByText(/Locating certified technicians/i))).toBeVisible();
  await expect(page.getByText('AC repair Standard Work')).toBeVisible();
  await expect(page.getByText('₹299')).toBeVisible();
});

test('clicking Search Now on booking confirmation screen redirects immediately without waiting', async ({ page, request }) => {
  const customer = await signedInCustomer(request);
  await signIn(page, customer);

  const queryParams = new URLSearchParams({
    type: 'service',
    service: 'Deep Cleaning Service',
    category: 'Cleaning',
    totalPrice: '649',
    city: 'Indore',
  }).toString();

  await page.goto(`/booking-success?${queryParams}`);
  await expect(page.getByRole('heading', { name: /Booking Confirmed!/i })).toBeVisible({ timeout: 10_000 });

  // Click "Search Now" button
  const searchNowBtn = page.getByRole('button', { name: /Search Now/i });
  await expect(searchNowBtn).toBeVisible();
  await searchNowBtn.click();

  // Immediately navigates to /searching-partner
  await expect(page).toHaveURL(/\/searching-partner/);
  await expect(page.getByRole('heading', { name: /Searching for Service Partner/i }).first()).toBeVisible();
  await expect(page.getByText('Deep Cleaning Service')).toBeVisible();
});

test('closing the search-ended pop-up keeps it closed — through polling and a reload — and polling stops', async ({ page, request }) => {
  const customer = await signedInCustomer(request);
  await signIn(page, customer);

  let lookups = 0;
  await page.route('**/api/v1/service-requests/sr_e2e_dismiss', (route) => {
    lookups += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'sr_e2e_dismiss',
          status: 'Cancelled',
          booking: { id: 'bk_e2e_dismiss', status: 'Cancelled', instantStatus: 'CANCELLED', searchEndReason: 'NO_PROVIDERS_NEARBY', address: { city: 'Indore' } },
        },
      }),
    });
  });

  await page.goto('/searching-partner?serviceRequestId=sr_e2e_dismiss&service=Repair&category=AC&city=Indore');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  // The page used to poll every 3s and re-open the pop-up each time.
  await page.waitForTimeout(7_000);
  await expect(dialog).toBeHidden();
  // A cancelled booking can't change, so it stops asking the server.
  expect(lookups).toBeLessThanOrEqual(2);

  await page.reload();
  await expect(page.getByRole('heading', { name: /No service provider near you/i })).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(4_000);
  await expect(page.getByRole('alertdialog')).toBeHidden();
});

// The server stops searching after 15 minutes and cancels the booking with a
// reason (booking.service.js expireStaleSearches). Waiting 15 real minutes in a
// browser test isn't practical, so these serve the page an already-expired
// booking and check the customer sees the right pop-up.
for (const scenario of [
  {
    reason: 'PROVIDERS_NOT_ACCEPTING',
    title: /Service providers are busy/i,
    message: /not accepting service requests right now\. Please retry after a few minutes/i,
  },
  {
    reason: 'NO_PROVIDERS_NEARBY',
    title: /No service provider near you/i,
    message: /no service provider near you right now\. Kindly retry after some time/i,
  },
]) {
  test(`shows the search-ended pop-up when the search timed out (${scenario.reason})`, async ({ page, request }) => {
    const customer = await signedInCustomer(request);
    await signIn(page, customer);

    const booking = {
      id: 'bk_e2e_search_ended',
      humanId: 'NCC-000000-0001',
      category: 'AC',
      status: 'Cancelled',
      instantStatus: 'CANCELLED',
      isAccepted: false,
      searchEndReason: scenario.reason,
      cancellationReason: 'Search timed out',
      address: { city: 'Indore' },
    };
    const envelope = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    await page.route('**/api/v1/service-requests/sr_e2e_search_ended', (route) =>
      route.fulfill(envelope({ id: 'sr_e2e_search_ended', humanId: 'SR-0001', status: 'Cancelled', booking })),
    );

    await page.goto('/searching-partner?serviceRequestId=sr_e2e_search_ended&service=Repair&category=AC&city=Indore');

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByRole('heading', { name: scenario.title })).toBeVisible();
    await expect(dialog.getByText(scenario.message)).toBeVisible();

    // Two ways forward: search again for the same booking, or book afresh.
    await expect(dialog.getByRole('button', { name: /Search Again/i })).toBeVisible();
    await dialog.getByRole('button', { name: /Create New Booking/i }).click();
    await expect(page).toHaveURL(/\/book\/AC/);
  });
}
