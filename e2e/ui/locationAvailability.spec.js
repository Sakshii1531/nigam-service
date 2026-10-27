import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
async function call(request, method, path, token, data) {
  const res = await request[method](`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`${method} ${path}: ${JSON.stringify(body.error)}`);
  return body.data;
}
async function session(request, role, identifier) {
  const loginSession = await call(request, 'post', '/auth/login', null, { role, identifier, password: 'password123' });
  if (role === 'customer' || role === 'service_provider') return loginSession;
  const otp = await call(request, 'get', `/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return call(request, 'post', '/auth/otp/verify', null, { role, identifier, code: otp.code });
}
async function signedPage(context, s, portal) {
  await context.addInitScript(({ s, portal }) => {
    localStorage.setItem(`ncc_access_token_${portal}`, s.accessToken);
    localStorage.setItem(`ncc_refresh_token_${portal}`, s.refreshToken);
    localStorage.setItem(`ncc_user_${portal}`, JSON.stringify(s.user));
    localStorage.setItem('ncc_customer_city', 'Indore');
    localStorage.setItem('ncc_customer_location', JSON.stringify({ city: 'Indore', state: 'Madhya Pradesh', isServiceable: true, fullAddress: 'Indore', latitude: null, longitude: null }));
  }, { s, portal });
  return context.newPage();
}
async function adminSession(request) {
  const email = `location-admin-${randomUUID()}@e2e.test`;
  await call(request, 'post', '/_dev/test-user', null, { role: 'super_admin', email, password: 'password123' });
  return session(request, 'super_admin', email);
}

test('desktop provider duty switch persists GPS and NCC sees online/offline without reload', async ({ browser, request }) => {
  test.setTimeout(90000);
  const number = phone();
  await call(request, 'post', '/_dev/test-serviceProvider', null, { phone: number, password: 'password123', specs: ['AC Repair'], availability: 'Available', serviceCityName: 'Indore' });
  const sp = await session(request, 'service_provider', number), admin = await adminSession(request);
  const partnerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['geolocation'], geolocation: { latitude: 22.72, longitude: 75.86 } });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const partner = await signedPage(partnerContext, sp, 'service_provider');
    const ncc = await signedPage(adminContext, admin, 'super_admin');
    await partner.goto('/service-provider/dashboard');
    const toggle = partner.getByRole('switch', { name: 'Online availability' });
    await expect(toggle).toBeVisible(); await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await ncc.goto('/super-admin/service-providers');
    await ncc.getByPlaceholder('Search Name, ID or Skill...').fill(number);
    const row = ncc.locator('tbody tr').first();
    await expect(row).toContainText('Available');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(row).toContainText('Offline', { timeout: 20000 });
    await partner.getByRole('button', { name: 'Keep Offline', exact: true }).click();
    await toggle.click();
    await partner.getByRole('button', { name: 'Go Online (Accept Jobs)', exact: true }).click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(row).toContainText('Available', { timeout: 20000 });
    const profile = await call(request, 'get', '/service-provider/profile/profile', sp.accessToken);
    expect(profile.location).toMatchObject({ latitude: 22.72, longitude: 75.86 });
    await partner.reload();
    await expect(partner.getByRole('switch', { name: 'Online availability' })).toHaveAttribute('aria-checked', 'true');
  } finally { await partnerContext.close(); await adminContext.close(); }
});

// Google SDK responses are deterministic; this verifies our browser integration,
// not external Google billing/referrer configuration or GPS device accuracy.
async function fakeGoogle(context) {
  await context.addInitScript(() => {
    window.__testMarkers = [];
    class Geocoder {
      geocode(query, done) {
        const latitude = query.location?.lat ?? 22.72, longitude = query.location?.lng ?? 75.86;
        const component = (long_name, type) => ({ long_name, types: [type] });
        setTimeout(() => done([{ formatted_address: 'Corporate House, Chhoti Gwaltoli, Indore, Madhya Pradesh 452001, India',
          address_components: [component('Corporate House', 'premise'), component('3', 'street_number'), component('Chhoti Gwaltoli', 'route'), component('Near Nexus Mall', 'sublocality_level_1'), component('Indore', 'locality'), component('Madhya Pradesh', 'administrative_area_level_1'), component('452001', 'postal_code')],
          geometry: { location: { lat: () => latitude, lng: () => longitude } } }], 'OK'), 10);
      }
    }
    class Map { setCenter() {} setZoom() {} panTo() {} addListener() {} }
    class Marker {
      constructor(options) { this.position = options.position; this.listeners = {}; window.__testMarkers.push(this); }
      setPosition(value) { this.position = value; }
      getPosition() { return { lat: () => this.position.lat, lng: () => this.position.lng }; }
      addListener(name, fn) { this.listeners[name] = fn; }
    }
    class Autocomplete { bindTo() {} addListener() {} }
    window.google = { maps: { Geocoder, Map, Marker, Animation: { DROP: 1 }, places: { Autocomplete }, event: { clearInstanceListeners() {} } } };
  });
}

test('customer adds and edits serviceable addresses with live GPS and a dragged map pin', async ({ browser, request }) => {
  test.setTimeout(90000);
  const admin = await adminSession(request);
  const cities = await call(request, 'get', '/super-admin/cities/public');
  if (!cities.some(c => c.name.toLowerCase() === 'indore')) await call(request, 'post', '/super-admin/cities', admin.accessToken, { name: 'Indore', state: 'Madhya Pradesh', status: 'Active' });
  const number = phone();
  await call(request, 'post', '/_dev/test-user', null, { role: 'customer', phone: number, password: 'password123' });
  const customer = await session(request, 'customer', number);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['geolocation'], geolocation: { latitude: 22.72, longitude: 75.86 } });
  await fakeGoogle(context);
  try {
    const page = await signedPage(context, customer, 'customer');
    await page.goto('/saved-addresses');
    await page.getByRole('button', { name: 'Add New Address', exact: true }).click();
    await page.getByRole('button', { name: 'Use my live location', exact: true }).click();
    await expect(page.getByLabel('State', { exact: true })).toHaveValue('Madhya Pradesh');
    await expect(page.getByLabel('City', { exact: true })).toHaveValue('Indore');
    await expect(page.getByLabel('Pincode', { exact: true })).toHaveValue('452001');
    await expect(page.getByLabel('House / Flat / Street Address *', { exact: true })).toHaveValue('Corporate House, 3, Chhoti Gwaltoli');
    await expect(page.getByText('Visit pin: 22.720000, 75.860000', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save Address', exact: true }).click();
    await expect(page.getByText('New address saved!', { exact: true })).toBeVisible();
    let saved = await call(request, 'get', '/auth/addresses', customer.accessToken);
    expect(saved[0]).toMatchObject({ city: 'Indore', state: 'Madhya Pradesh', latitude: 22.72, longitude: 75.86 });
    await page.getByRole('button', { name: 'Edit Address', exact: true }).click();
    await page.getByRole('button', { name: 'Choose / drag map pin', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Confirm & Pin Location', exact: true })).toBeEnabled();
    await page.evaluate(() => { const marker = window.__testMarkers.at(-1); marker.setPosition({ lat: 22.725, lng: 75.87 }); marker.listeners.dragend(); });
    await expect(page.getByText('22.72500, 75.87000', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm & Pin Location', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirm & Pin Location', exact: true }).click();
    await expect(page.getByText('Visit pin: 22.725000, 75.870000', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Update Address', exact: true }).click();
    await expect(page.getByText('Address updated successfully!', { exact: true })).toBeVisible();
    saved = await call(request, 'get', '/auth/addresses', customer.accessToken);
    expect(saved[0]).toMatchObject({ latitude: 22.725, longitude: 75.87 });
    await page.reload();
    await page.getByRole('button', { name: 'Edit Address', exact: true }).click();
    await expect(page.getByText('Visit pin: 22.725000, 75.870000', { exact: true })).toBeVisible();
    await page.getByLabel('City', { exact: true }).selectOption('');
    await expect(page.getByText(/No visit pin saved/)).toBeVisible();
    await page.getByRole('button', { name: 'Choose / drag map pin', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Confirm & Pin Location', exact: true })).toBeDisabled();
    await page.evaluate(() => { navigator.geolocation.getCurrentPosition = (_success, fail) => fail({ code: 1 }); });
    await page.getByRole('button', { name: 'Use Current Location', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Location permission denied');
    await expect(page.getByRole('button', { name: 'Confirm & Pin Location', exact: true })).toBeDisabled();
  } finally { await context.close(); }
});
