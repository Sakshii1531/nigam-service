import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const API = 'http://localhost:4111/api/v1';
async function call(request, method, path, token, data) {
  const res = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`${path}: ${JSON.stringify(body.error)}`);
  return body.data;
}
async function login(request, role, identifier) {
  if (role === 'customer' || role === 'service_provider') return call(request, 'post', '/auth/login', '', { role, identifier, password: 'password123' });
  await request.post(`${API}/auth/otp/send`, { data: { role, identifier } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return call(request, 'post', '/auth/otp/verify', '', { role, identifier, code });
}

for (const kind of ['amc', 'extended-warranty']) {
  test(`${kind}: configured brands, private invoice, interrupted payment and reload produce one verified purchase`, async ({ page, request }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 390, height: 844 });
    const tag = randomUUID().slice(0, 8), brandName = `Configured Brand ${tag}`, planName = `Configured Protection ${tag}`;
    const email = `purchase-admin-${tag}@e2e.test`;
    await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
    const admin = await login(request, 'super_admin', email);
    await call(request, 'post', '/super-admin/catalogue/brands', admin.accessToken, { name: brandName, categories: ['AC'], isActive: true });
    const phone = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
    await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, name: 'Protection Buyer', password: 'password123' } });
    const customer = await login(request, 'customer', phone);
    await call(request, 'post', '/auth/addresses', customer.accessToken, {type:'Home',house:'15 Protection Street',city:'Indore',state:'Madhya Pradesh',pincode:'452001',isDefault:true,latitude:22.7196,longitude:75.8577});
    const appliance = await call(request, 'post', '/appliances', customer.accessToken, { nickname: `Bedroom AC ${tag}`, category: 'AC', brand: brandName, modelNumber: 'MODEL-42', serialNumber: tag, purchaseDate: new Date(Date.now() - 86400000 * 20).toISOString().slice(0, 10), createSeparateUnit: true });
    const uploaded = await request.post(`${API}/appliances/${appliance.id}/documents`, { headers: { Authorization: `Bearer ${customer.accessToken}` }, multipart: { kind: 'invoice', file: { name: 'purchase.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') } } });
    expect(uploaded.status()).toBe(201);
    const amc = kind === 'amc';
    const plan = await call(request, 'post', `/super-admin/plans/${amc ? 'amc' : 'extended-warranty'}`, admin.accessToken, { name: planName, applianceCategory: 'AC', price: 699, requiresInvoice: true, maxApplianceAgeMonths: 12, ...(amc ? { tier: 'Silver', visitsTotal: 3, durationMonths: 18, benefits: ['Configured service benefit'] } : { durationYears: 2, claimsTotal: 3, features: ['Configured service benefit'] }) });
    const base = amc ? '/buy/amc' : '/buy/select-appliance';
    if (amc) {
      await page.goto(`${base}?category=AC&plan=${plan.id}&view=details`);
      await expect(page).toHaveURL(/\/login$/);
      await page.getByPlaceholder('Enter Phone Number', {exact:true}).fill(phone);
      await page.getByPlaceholder('Enter Password', {exact:true}).fill('password123');
      await page.getByRole('button', {name:'Login',exact:true}).click();
      await expect(page).toHaveURL(new RegExp(`${base}\\?category=AC&plan=${plan.id}&view=details$`));
      await expect(page.getByLabel('Protection appliance', {exact:true})).toBeVisible();
    }
    await page.addInitScript(s => {
      localStorage.setItem('ncc_access_token_customer', s.accessToken);
      localStorage.setItem('ncc_user_customer', JSON.stringify(s.user));
      // Only the external gateway UI is simulated. The app calls its actual
      // purchase, order creation and signature verification APIs.
      window.Razorpay = class {
        constructor(options) { this.options = options; }
        on() {}
        async open() {
          const o = this.options;
          if (!sessionStorage.getItem('gateway_dismissed')) {
            sessionStorage.setItem('gateway_dismissed', 'yes');
            o.modal.ondismiss();
            return;
          }
          const paymentId = `pay_browser_${o.order_id}`;
          const result = await fetch('http://localhost:4111/api/v1/_dev/razorpay-sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: o.order_id, paymentId }) });
          const { data } = await result.json();
          o.handler({ razorpay_payment_id: paymentId, razorpay_signature: data.signature });
        }
      };
    }, customer);
    await page.route('**/warranty-amc/checkouts/*/payment', async route => {
      const response = await route.fetch();
      const json = await response.json();
      if (json.data?.razorpay) json.data.razorpay.keyId = 'test_gateway_browser';
      await route.fulfill({ response, json });
    });
    await page.goto(`${base}?category=AC&plan=${plan.id}&view=details`);
    await page.getByRole('button', { name: 'Register an appliance', exact: true }).click();
    const registration = page.getByRole('dialog');
    await expect(registration.getByLabel('Category', { exact: true })).toHaveValue('AC');
    await expect(registration.getByLabel('Category', { exact: true })).toHaveAttribute('readonly', '');
    await expect(registration.getByLabel('Brand', { exact: true }).getByRole('option', { name: brandName, exact: true })).toHaveCount(1);
    await registration.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByLabel('Protection appliance', { exact: true }).selectOption(appliance.id);
    await expect(page.getByText(brandName, { exact: false }).first()).toBeVisible();
    await page.getByLabel('Protection pincode', { exact: true }).fill('452001');
    await expect(page.getByLabel('Protection purchase invoice')).toContainText('purchase.pdf');
    await page.getByRole('button', { name: 'Review plan & details', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Review your protection' })).toBeVisible();
    await expect(page.getByText('Configured service benefit', { exact: true })).toBeVisible();
    await page.screenshot({ path: `/tmp/${kind}-purchase-review-mobile.png`, fullPage: true });
    await page.getByRole('button', { name: /^Pay .* securely$/ }).click();
    await expect(page.getByRole('heading', { name: 'Payment confirmation pending' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('cancelled');
    const checkoutKey = new URL(page.url()).searchParams.get('checkout');
    expect(checkoutKey).toBeTruthy();
    const pending = await call(request, 'get', `/warranty-amc/checkouts/${checkoutKey}`, customer.accessToken);
    expect(pending.purchase.paid).toBe(false);
    await page.reload();
    await page.getByRole('button', { name: 'Continue payment', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your protection plan is confirmed' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your protection plan is confirmed' })).toBeVisible();
    const paid = await call(request, 'get', `/warranty-amc/checkouts/${checkoutKey}`, customer.accessToken);
    expect(paid.purchase.id).toBe(pending.purchase.id);
    expect(paid.purchase.paid).toBe(true);
    expect(paid.invoice.name).toBe('purchase.pdf');
    const invoice = await request.get(`${API}/warranty-amc/checkouts/${checkoutKey}/invoice`, { headers: { Authorization: `Bearer ${admin.accessToken}` } });
    expect(invoice.status()).toBe(200);
    await page.getByRole('button', { name: 'View my plan details', exact: true }).click();
    await expect(page.getByRole('heading', { name: planName, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View private invoice', exact: true })).toBeVisible();
    await expect(page.getByText('Configured service benefit', { exact: true })).toBeVisible();
    await page.screenshot({ path: `/tmp/${kind}-purchased-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `/tmp/${kind}-purchased-desktop.png`, fullPage: true });
    if (!amc) {
      await page.setViewportSize({width:390,height:844});
      await page.getByLabel('Protection service issue', {exact:true}).fill('AC airflow is weak');
      await page.getByRole('button', {name:'Schedule warranty service',exact:true}).click();
      await page.getByText('Split AC', {exact:true}).click();
      await page.getByRole('button', {name:/^1\.5 Ton/}).click();
      await page.getByRole('button', {name:/Continue — Select Service/i}).click();
      await page.getByRole('button', {name:/Installation/i}).first().click();
      await page.getByRole('button', {name:/Continue — Schedule Visit/i}).click();
      await expect(page.getByLabel('Select saved appliance')).toHaveValue(appliance.id);
      await page.getByText(/Service Needed Now/i).click();
      await page.getByRole('button', {name:/Continue — Address & Payment/i}).click();
      await page.getByLabel('Wall type *', {exact:true}).selectOption('Brick');
      await expect(page.getByRole('region', {name:'Applied protection'})).toContainText(planName);
      const booked = page.waitForResponse(r => r.url() === `${API}/bookings` && r.request().method() === 'POST');
      await page.getByRole('button', {name:/Pay ₹0 & Confirm Booking/}).click();
      const response = await booked;
      expect(response.status()).toBe(201);
      const result = (await response.json()).data;
      expect(result.serviceRequest.extendedWarrantyOrder).toBe(paid.purchase.id);
      expect(result.serviceRequest.amcSubscription).toBeNull();
      expect(result.booking.totalPrice).toBe(0);
      await call(request, 'post', `/bookings/${result.booking.id}/cancel`, customer.accessToken, {reason:'Test cleanup'});
      await page.goto(`/protection-plans/extended-warranty/${paid.purchase.id}`);
      await expect(page.getByText(result.booking.humanId, {exact:true})).toBeVisible();
      await expect(page.getByText('Cancelled', {exact:true})).toBeVisible();
    }
  });
}
