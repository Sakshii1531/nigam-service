import { test, expect } from '@playwright/test';
import { randomUUID, createHmac } from 'node:crypto';

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const STUB_SECRET = 'dev-only-razorpay-stub-secret-never-used-in-production';
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
async function call(request, method, path, token, data) {
  const response = await request[method](`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, ...(data ? { data } : {}) });
  const body = await response.json();
  expect(response.ok(), `${method} ${path}: ${JSON.stringify(body.error)}`).toBeTruthy();
  return body.data;
}
async function session(request, role) {
  const identifier = role === 'customer' ? phone() : `warranty-${randomUUID()}@e2e.test`;
  await call(request, 'post', '/_dev/test-user', null, { role, ...(role === 'customer' ? { phone: identifier } : { email: identifier }), password: 'password123' });
  await call(request, 'post', '/auth/login', null, { role, identifier, password: 'password123' });
  const { code } = await call(request, 'get', `/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return call(request, 'post', '/auth/otp/verify', null, { role, identifier, code });
}
async function setup(page, request) {
  const admin = await session(request, 'super_admin');
  const customer = await session(request, 'customer');
  const tag = randomUUID().slice(0, 7);
  const brand = `AC Manufacturer ${tag}`;
  const fridgeBrand = `Fridge Manufacturer ${tag}`;
  await call(request, 'post', '/super-admin/catalogue/brands', admin.accessToken, { name: brand, categories: ['AC'], warrantyMonths: 12 });
  await call(request, 'post', '/super-admin/catalogue/brands', admin.accessToken, { name: fridgeBrand, categories: ['Refrigerator'] });
  await page.addInitScript(s => {
    localStorage.setItem('ncc_access_token', s.accessToken);
    localStorage.setItem('ncc_refresh_token', s.refreshToken);
    localStorage.setItem('ncc_user', JSON.stringify(s.user));
  }, customer);
  // Only Checkout.js is simulated. Purchases, orders and signature verification
  // all use the real HTTP server and the test gateway's real HMAC checks.
  await page.exposeFunction('testGatewaySignature', orderId => {
    const paymentId = `pay_${randomUUID()}`;
    return { razorpay_payment_id: paymentId, razorpay_signature: createHmac('sha256', STUB_SECRET).update(`${orderId}|${paymentId}`).digest('hex') };
  });
  await page.addInitScript(() => {
    window.Razorpay = class {
      constructor(options) { this.options = options; }
      on() {}
      async open() {
        if (window.cancelTestPayment) { this.options.modal.ondismiss(); return; }
        this.options.handler(await window.testGatewaySignature(this.options.order_id));
      }
    };
  });
  return { admin, customer, tag, brand, fridgeBrand };
}
async function coveredBooking(page, brand, applianceId) {
  await page.goto('/book/AC');
  await expect(page.getByRole('heading', { name: /Select AC Type/i })).toBeVisible();
  await page.getByText('Split AC', { exact: true }).click();
  await page.getByRole('button', { name: /^1\.5 Ton/ }).click();
  await page.getByRole('button', { name: /Continue — Select Service/ }).click();
  await page.getByRole('button', { name: /Repair/i }).first().click();
  await page.getByRole('button', { name: /Continue — Schedule Visit/ }).click();
  const quoteResponse = page.waitForResponse(async response => {
    if (!response.url().endsWith('/catalog/quote') || response.request().method() !== 'POST') return false;
    const warranty = response.request().postDataJSON()?.warranty;
    return warranty?.brand === brand && (!applianceId || warranty.applianceId === applianceId);
  });
  await page.locator('select').first().selectOption(brand);
  if (applianceId) {
    const picker = page.locator('select').nth(1);
    await expect(picker).toBeVisible();
    await picker.selectOption(applianceId);
  }
  const quote = (await (await quoteResponse).json()).data;
  expect(quote.totals.final).toBe(0);
  expect(quote.totals.coverage).toBeGreaterThan(0);
  await expect(page.locator('.fixed.bottom-0').getByText('₹0', { exact: true }).first()).toBeVisible();
}

test.use({ viewport: { width: 390, height: 844 } });
test('AMC Silver checkout uses admin AC brands, handles cancelled payment, shows Silver in profile, and quotes covered service at zero', async ({ page, request }) => {
  test.setTimeout(90000);
  const { admin, customer, tag, brand, fridgeBrand } = await setup(page, request);
  const name = `AC Silver ${tag}`;
  await call(request, 'post', '/super-admin/plans/amc', admin.accessToken, { name, tier: 'Silver', applianceCategory: 'AC', price: 999, visitsTotal: 2, durationMonths: 6, benefits: ['Two covered visits'] });
  await page.goto('/buy/amc/plans/AC');
  await page.getByText(name, { exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('select').first().locator('option').filter({ hasText: brand })).toHaveCount(1);
  await expect(page.locator('select').first().locator('option').filter({ hasText: fridgeBrand })).toHaveCount(0);
  await page.locator('select').first().selectOption(brand);
  await page.getByPlaceholder('e.g. 1.5T Inverter LS-Q18YNZA').fill('AC-TEST');
  await page.locator('input[type=date]').fill(new Date().toISOString().slice(0, 10));
  await page.getByPlaceholder('Enter pincode').fill('452001');
  await page.locator('input[type=file]').setInputFiles({ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%e2e invoice\n') });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Proceed to Payment' }).click();
  await page.evaluate(() => { window.cancelTestPayment = true; });
  await page.getByRole('button', { name: /Pay ₹999 Securely/ }).click();
  await expect(page.getByText('Payment was cancelled before it completed.')).toBeVisible();
  let policies = await call(request, 'get', '/warranty-amc/amc/subscriptions', customer.accessToken);
  expect(policies.some(p => p.paid)).toBe(false);
  await page.evaluate(() => { window.cancelTestPayment = false; });
  await page.getByRole('button', { name: /Pay ₹999 Securely/ }).click();
  await expect(page).toHaveURL(/\/buy\/amc\/success\//);
  await expect(page.getByText('6 Months AMC')).toBeVisible();
  policies = await call(request, 'get', '/warranty-amc/amc/subscriptions', customer.accessToken);
  expect(policies.filter(p => p.paid)).toHaveLength(1);
  expect(policies.find(p => p.paid)).toMatchObject({ brand, applianceCategory: 'AC', pincode: '452001', invoiceFileUrl: expect.stringContaining('/uploads/'), installationDate: expect.any(String), plan: { name, tier: 'Silver' } });
  await page.goto('/profile');
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('GOLD PLAN', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'View Benefits', exact: true }).click();
  const benefits = page.getByRole('dialog', { name });
  await expect(benefits.getByText('Two covered visits')).toBeVisible();
  await expect(benefits.getByText('2 of 2 visits remaining')).toBeVisible();
  await benefits.getByRole('button', { name: 'Close', exact: true }).click();
  await coveredBooking(page, brand);
});

test('extended warranty registers a real appliance, filters packs, verifies payment, and applies appliance coverage in booking', async ({ page, request }) => {
  test.setTimeout(90000);
  const { admin, customer, tag, brand, fridgeBrand } = await setup(page, request);
  const name = `AC Shield ${tag}`;
  const fridgeName = `Fridge Shield ${tag}`;
  await call(request, 'post', '/super-admin/plans/extended-warranty', admin.accessToken, { name, applianceCategory: 'AC', price: 1499, durationYears: 2, claimsTotal: 2, features: ['Covered repairs'] });
  await call(request, 'post', '/super-admin/plans/extended-warranty', admin.accessToken, { name: fridgeName, applianceCategory: 'Refrigerator', price: 999, durationYears: 1, claimsTotal: 1 });
  await page.goto('/extend-warranty');
  await page.getByRole('button', { name: 'Register & Extend New' }).click();
  await page.getByText('AC', { exact: true }).click();
  await page.getByText(brand, { exact: true }).click();
  await expect(page.getByText(fridgeBrand, { exact: true })).toHaveCount(0);
  await page.getByPlaceholder('e.g. MS-Q18YNZA').fill('UNIT-EW');
  await page.getByPlaceholder('e.g. SN-89201948-Z').fill(`SERIAL-${tag}`);
  await page.locator('input[type=date]').fill(new Date(Date.now() - 2 * 365 * 864e5).toISOString().slice(0, 10));
  await page.getByRole('button', { name: 'Verify Active Brand Warranty' }).click();
  await expect(page.getByText('Renewal & Extension Packs')).toBeVisible();
  await expect(page.getByText(fridgeName, { exact: true })).toHaveCount(0);
  await page.getByText(name, { exact: true }).click();
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
  await page.getByRole('button', { name: /Pay ₹1,499 Securely/ }).click();
  await expect(page.getByRole('heading', { name: 'Warranty Extended!' })).toBeVisible();
  const orders = await call(request, 'get', '/warranty-amc/extended-warranty/orders', customer.accessToken);
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({ paid: true, applianceCategory: 'AC', brand, claimsRemaining: 2 });
  expect(orders[0].appliance).toBeTruthy();
  const appliance = await call(request, 'get', `/appliances/${orders[0].appliance}`, customer.accessToken);
  expect(appliance.warrantyStatus).toBe('Extended Warranty');
  await call(request, 'post', '/appliances', customer.accessToken, { category: 'AC', brand, modelNumber: 'OTHER-UNIT', serialNumber: `OTHER-${tag}`, purchaseDate: new Date(Date.now() - 2 * 365 * 864e5).toISOString() });
  await coveredBooking(page, brand, appliance.id);
});
