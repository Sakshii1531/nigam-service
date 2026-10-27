import { test, expect } from '@playwright/test';
import { randomUUID, createHmac } from 'node:crypto';
const API = 'http://localhost:4111/api/v1';
async function call(request, method, path, token, data) {
  const response = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token || ''}` }, ...(data ? { data } : {}) });
  const result = await response.json(); expect(response.ok(), JSON.stringify(result.error)).toBe(true); return result.data;
}
async function session(request, role, identifier) {
  const loginSession = await call(request, 'post', '/auth/login', '', { role, identifier, password: 'password123' });
  if (role === 'customer' || role === 'service_provider') return loginSession;
  const code = (await request.get(`${API}/_dev/last-otp/${identifier}`).then(r => r.json())).data.code;
  return call(request, 'post', '/auth/otp/verify', '', { role, identifier, code });
}
async function signIn(page, value, portal) {
  await page.addInitScript(({ value, portal }) => { localStorage.setItem(`ncc_access_token_${portal}`, value.accessToken); localStorage.setItem(`ncc_refresh_token_${portal}`, value.refreshToken); localStorage.setItem(`ncc_user_${portal}`, JSON.stringify(value.user)); }, { value, portal });
}
test('signup, interview subset, final approval, kit payment, shipping and parcel code unlock jobs', async ({ browser, request }) => {
  test.setTimeout(120000);
  const tag = randomUUID().slice(0, 8), adminEmail = `onboarding-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const admin = await session(request, 'super_admin', adminEmail), categories = await call(request, 'get', '/super-admin/catalogue/categories', admin.accessToken), selectedCategories = categories.filter(c => c.isActive).slice(0, 5);
  expect(selectedCategories.length).toBeGreaterThanOrEqual(2);
  const city = await call(request, 'post', '/super-admin/cities', admin.accessToken, { name: `Onboard City ${tag}`, state: 'Maharashtra', status: 'Active' });
  const phone = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  const created = await request.post(`${API}/service-provider/register`, { multipart: { name: 'Browser Provider', phone, password: 'password123', email: `onboarding-provider-${tag}@e2e.test`, city: city.name, state: city.state, specs: JSON.stringify(selectedCategories.map(c => c.id)), aadharFront: { name: 'front.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nfront') }, aadharBack: { name: 'back.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nback') } } });
  expect(created.status()).toBe(201); const application = (await created.json()).data;
  const provider = await session(request, 'service_provider', phone), providerContext = await browser.newContext({ viewport: { width: 390, height: 844 } }), providerPage = await providerContext.newPage();
  await signIn(providerPage, provider, 'service_provider'); await providerPage.goto('/service-provider/dashboard');
  await expect(providerPage).toHaveURL(/\/service-provider\/onboarding$/); await expect(providerPage.getByRole('heading', { name: 'My onboarding' })).toBeVisible();
  await expect(providerPage.getByRole('button', { name: 'Go Online', exact: true })).toHaveCount(0);
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), adminPage = await adminContext.newPage();
  adminPage.on('pageerror', error => console.log('Admin page error:', error.message));
  await signIn(adminPage, admin, 'super_admin');
  await adminPage.goto('/super-admin/pending-service-providers');
  await expect(adminPage.getByRole('heading', { name: 'Pending Service Providers', exact: true, level: 2 })).toBeVisible();
  await expect(adminPage.getByLabel('Provider status')).toBeDisabled();
  const applicantRow = adminPage.locator('tr').filter({ hasText: 'Browser Provider' });
  await expect(applicantRow).toContainText('Pending');
  await applicantRow.getByTitle('View Profile').click();
  await expect(adminPage.getByText('No service activity yet.', { exact: true })).toBeVisible();
  await expect(adminPage.getByText('Applicant — onboarding pending', { exact: false })).toBeVisible();
  await expect(adminPage.getByText('Verified Nigam Service Partner', { exact: false })).toHaveCount(0);
  for (const side of ['front', 'back']) {
    const responsePromise = adminPage.waitForResponse(r => r.url().endsWith(`/provider-onboarding/${application.id}/documents/${side}`));
    await adminPage.getByRole('button', { name: `Review Aadhaar ${side}`, exact: true }).click();
    const response = await responsePromise; expect(response.status()).toBe(200);
    expect((await response.json()).data.url).toMatch(/^data:application\/pdf/);
    await expect(adminPage.locator('iframe[title="Aadhaar document preview"]')).toHaveAttribute('src', /^blob:/);
    await adminPage.getByRole('button', { name: 'Close document', exact: true }).click();
  }
  await adminPage.screenshot({ path: '/tmp/nigam-pending-provider-profile.png', fullPage: true });
  await adminPage.goto(`/super-admin/provider-onboarding?provider=${application.id}`);
  await expect(adminPage.getByRole('heading', { name: 'Provider onboarding', exact: true })).toBeVisible({ timeout: 15000 });
  await adminPage.getByLabel('Review action', { exact: true }).selectOption('interview_pass');
  await adminPage.getByLabel('Reason super admin is conducting the ASM interview').fill('Area ASM unavailable; interview conducted by NCC');
  await adminPage.getByLabel('I reviewed and verified both Aadhaar documents').check(); await adminPage.getByLabel('Background review completed').check();
  for (let index = 0; index < selectedCategories.length; index++) { await adminPage.getByLabel(`Decision ${index + 1}`, { exact: true }).selectOption(index < 2 ? 'approved' : 'declined'); await adminPage.getByLabel(`Category reason ${index + 1}`, { exact: true }).fill(index < 2 ? 'Skill demonstrated' : 'Needs training'); }
  await adminPage.getByLabel('Decision reason / message to provider').fill('Interview passed for two categories'); await adminPage.getByRole('button', { name: 'Save onboarding decision' }).click();
  await expect(adminPage.getByRole('heading', { name: 'Super-admin final review', exact: true })).toBeVisible();
  await adminPage.getByLabel('Decision reason / message to provider').fill('Final review completed'); await adminPage.getByRole('button', { name: 'Save onboarding decision' }).click();
  await expect(adminPage.getByText('Final review complete.', { exact: false })).toBeVisible();
  await adminPage.screenshot({ path: '/tmp/nigam-onboarding-admin-review.png', fullPage: true });
  await providerPage.reload(); await expect(providerPage.getByRole('link', { name: 'Shop kits & track orders' })).toBeVisible();
  await expect(providerPage.getByRole('button', { name: 'Go Online', exact: true })).toHaveCount(0);
  await adminPage.goto('/super-admin/provider-kits'); await adminPage.getByRole('button', { name: 'Create kit', exact: true }).click();
  await adminPage.getByLabel('SKU', { exact: true }).fill(`E2E-ONBOARD-${tag}`); await adminPage.getByLabel('Kit name', { exact: true }).fill(`Starter Kit ${tag}`); await adminPage.getByLabel('Selling price (INR, tax inclusive)').fill('799'); await adminPage.getByLabel('Shipping per kit (INR)').fill('50'); await adminPage.getByLabel('Available stock', { exact: true }).fill('5'); await adminPage.getByRole('button', { name: 'Save kit', exact: true }).click();
  await expect(adminPage.getByRole('heading', { name: `Starter Kit ${tag}`, exact: true })).toBeVisible();
  await adminPage.screenshot({ path: '/tmp/onboarding-kit-catalog.png', fullPage: true });
  await providerPage.getByRole('link', { name: 'Shop kits & track orders' }).click(); await providerPage.getByRole('button', { name: `Add Starter Kit ${tag} to cart`, exact: true }).click();
  await providerPage.getByRole('button', { name: 'Continue to checkout', exact: true }).click();
  for (const [name, value] of [['House / street address', '12 Provider Lane'], ['Shipping city', 'Delivery City'], ['Shipping state', 'Maharashtra'], ['Pincode', '400001']]) await providerPage.getByLabel(name, { exact: true }).fill(value);
  // Stub only the external gateway widget; the real backend verifies the HMAC.
  await providerPage.addInitScript(() => {});
  await providerPage.evaluate(() => {
    window.Razorpay = class { constructor(options) { this.options = options; } on() {} open() { window.dispatchEvent(new CustomEvent('test:kit-payment', { detail: this.options.order_id })); window.__kitCheckoutOptions = this.options; } };
  });
  await providerPage.getByRole('button', { name: 'Pay for kits' }).click();
  await expect.poll(() => providerPage.evaluate(() => window.__kitCheckoutOptions?.order_id)).toBeTruthy();
  const orderId = await providerPage.evaluate(() => window.__kitCheckoutOptions.order_id), paymentId = `pay_browser_${tag}`, signature = createHmac('sha256', 'dev-only-razorpay-stub-secret-never-used-in-production').update(`${orderId}|${paymentId}`).digest('hex');
  await providerPage.evaluate(({ paymentId, signature }) => window.__kitCheckoutOptions.handler({ razorpay_payment_id: paymentId, razorpay_signature: signature }), { paymentId, signature });
  await expect(providerPage.getByRole('status')).toContainText('Payment confirmed');
  const orders = await call(request, 'get', '/service-provider/kits/orders', provider.accessToken), order = orders[0];
  await adminPage.goto('/super-admin/provider-kit-orders'); const card = adminPage.locator('article').filter({ hasText: order.humanId });
  await card.getByRole('button', { name: 'Mark Packed', exact: true }).click(); await expect(card.getByRole('button', { name: 'Show receipt insert for packing' })).toBeVisible();
  await card.getByRole('button', { name: 'Show receipt insert for packing' }).click();
  const code = await card.locator('section[aria-label="Receipt insert"] .font-mono').innerText();
  await card.getByLabel('Courier', { exact: true }).fill('Test Courier'); await card.getByLabel('Tracking number', { exact: true }).fill(`SHIP-${tag}`); await card.getByRole('button', { name: 'Mark Shipped', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Mark Delivered', exact: true })).toBeVisible();
  await adminPage.screenshot({ path: '/tmp/onboarding-kit-fulfillment.png', fullPage: true });
  await providerPage.reload(); const ownOrder = providerPage.locator('article').filter({ hasText: order.humanId });
  await ownOrder.getByLabel('Receipt code inside your parcel').fill(code); await ownOrder.getByRole('button', { name: 'Verify received kit' }).click();
  await expect(ownOrder.getByText('Receipt verified. Check My onboarding for job eligibility.')).toBeVisible();
  await providerPage.getByRole('link', { name: 'My onboarding', exact: true }).click(); await expect(providerPage.getByRole('button', { name: 'Go Online', exact: true })).toBeVisible();
  await providerPage.screenshot({ path: '/tmp/nigam-onboarding-provider-ready.png', fullPage: true });
  await providerPage.getByRole('button', { name: 'Go Online', exact: true }).click(); await expect(providerPage).toHaveURL(/\/service-provider\/dashboard$/);
  const profile = await call(request, 'get', '/service-provider/profile/profile', provider.accessToken); expect(profile.specs.sort()).toEqual(selectedCategories.slice(0, 2).map(c => c.key).sort()); expect(profile.availability).toBe('Available');
  await providerContext.close(); await adminContext.close();
});
