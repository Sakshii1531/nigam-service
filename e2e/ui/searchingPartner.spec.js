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
