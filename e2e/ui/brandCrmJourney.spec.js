import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const SHOTS = fileURLToPath(new URL('../../docs/brand-crm/screenshots/', import.meta.url));
fs.mkdirSync(SHOTS, { recursive: true });
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

async function call(request, method, path, token, data) {
  const response = await request[method](`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...(data ? { data } : {})
  });
  const body = await response.json();
  if (!response.ok()) throw new Error(`${method.toUpperCase()} ${path} → ${response.status()}: ${JSON.stringify(body.error)}`);
  return body.data;
}

async function session(request, role, identifier) {
  await request.post(`${API}/auth/otp/send`, { data: { role, identifier } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return call(request, 'post', '/auth/otp/verify', '', { role, identifier, code });
}

async function pageFor(browser, auth, portal, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ auth, portal }) => {
    const suffix = portal ? `_${portal}` : '';
    localStorage.setItem(`ncc_access_token${suffix}`, auth.accessToken);
    localStorage.setItem(`ncc_refresh_token${suffix}`, auth.refreshToken);
    localStorage.setItem(`ncc_user${suffix}`, JSON.stringify(auth.user));
  }, { auth, portal });
  return context.newPage();
}

const shot = (page, number, name) => page.screenshot({ path: `${SHOTS}phase-19-${number}-${name}.png`, fullPage: true });

test('client acceptance walkthrough across every Brand CRM role and application', async ({ browser, request }) => {
  test.setTimeout(300000);
  const tag = randomUUID().slice(0, 8);
  const city = `Pune ${tag}`;
  async function staff(role, template, brand, permissions = []) {
    const email = `p19-${template || role}-${brand ? String(brand).slice(-5) : 'platform'}-${tag}@e2e.test`;
    await request.post(`${API}/_dev/test-user`, {
      data: {
        role,
        email,
        password: 'password123',
        ...(brand ? { brand, brandRoleTemplate: template, employeeId: `${template || role}-${tag}` } : { platformPermissions: permissions })
      }
    });
    return { email, auth: await session(request, role, email) };
  }

  const admin = await staff('super_admin', '', '', ['billing:manage']);
  const category = (await call(request, 'get', '/super-admin/catalogue/categories', admin.auth.accessToken)).find(row => row.key === 'AC');
  const brand = await call(request, 'post', '/super-admin/brands', admin.auth.accessToken, { name: `Phase 19 LG ${tag}`, status: 'Active' });
  const foreignBrand = await call(request, 'post', '/super-admin/brands', admin.auth.accessToken, { name: `Phase 19 Samsung ${tag}`, status: 'Active' });
  for (const item of [brand, foreignBrand]) {
    await call(request, 'put', `/super-admin/warranty-catalog/brands/${item.id}`, admin.auth.accessToken, { warrantyEnabled: true, coverage: [category.id] });
  }
  const issue = await call(request, 'post', '/super-admin/warranty-catalog/issues', admin.auth.accessToken, { category: category.id, name: `Cooling failure ${tag}` });
  await call(request, 'post', '/super-admin/cities', admin.auth.accessToken, { name: city, state: 'Maharashtra', status: 'Active' });
  await call(request, 'post', '/super-admin/brand-rates', admin.auth.accessToken, {
    brand: brand.id,
    category: category.id,
    serviceType: 'repair',
    state: 'Maharashtra',
    city,
    brandRate: 300,
    partnerPayout: 200,
    effectiveFrom: '2026-01-01'
  });

  const owner = await staff('brand_admin', 'brand_super_admin', brand.id);
  const cce = await staff('brand_admin', 'cce', brand.id);
  const warranty = await staff('brand_admin', 'warranty_executive', brand.id);
  const spares = await staff('brand_admin', 'spare_parts', brand.id);
  const foreign = await staff('brand_admin', 'brand_super_admin', foreignBrand.id);
  const partnerPhone = phone();
  await request.post(`${API}/_dev/test-serviceProvider`, {
    data: { phone: partnerPhone, password: 'password123', specs: ['AC'], serviceCityName: city, availability: 'Available' }
  });
  const partnerAuth = await session(request, 'service_provider', partnerPhone);

  const pages = [];
  const ccePage = await pageFor(browser, cce.auth, 'brand_admin'); pages.push(ccePage);
  const warrantyPage = await pageFor(browser, warranty.auth, 'brand_admin'); pages.push(warrantyPage);
  const brandPage = await pageFor(browser, owner.auth, 'brand_admin'); pages.push(brandPage);
  const adminPage = await pageFor(browser, admin.auth, 'super_admin'); pages.push(adminPage);
  const partnerPage = await pageFor(browser, partnerAuth, '', { width: 390, height: 844 }); pages.push(partnerPage);
  const foreignPage = await pageFor(browser, foreign.auth, 'brand_admin'); pages.push(foreignPage);

  await partnerPage.goto('/service-provider/dashboard');
  await expect(partnerPage.getByText(/Online · Accepting jobs/)).toBeVisible({ timeout: 15000 });

  const customerPhone = phone();
  await ccePage.goto('/brand-admin/requests');
  await ccePage.getByLabel('Mobile number', { exact: true }).fill(customerPhone);
  await ccePage.getByRole('button', { name: 'Find customer', exact: true }).click();
  await expect(ccePage.getByText('No customer found. Create their account with this ticket.')).toBeVisible();
  await ccePage.getByLabel('Customer name', { exact: true }).fill(`Phase 19 Customer ${tag}`);
  await ccePage.getByRole('button', { name: 'Continue', exact: true }).click();
  await ccePage.getByLabel('House / street', { exact: true }).fill('19 Acceptance Lane');
  await ccePage.getByLabel('City', { exact: true }).fill(city);
  await ccePage.getByLabel('State', { exact: true }).fill('Maharashtra');
  await ccePage.getByLabel('Pincode', { exact: true }).fill('411001');
  await ccePage.getByRole('button', { name: 'Next', exact: true }).click();
  await ccePage.getByLabel('Product category', { exact: true }).selectOption(category.id);
  await ccePage.getByRole('button', { name: 'Next', exact: true }).click();
  await ccePage.getByLabel('Issue', { exact: true }).selectOption(issue.id);
  await ccePage.getByLabel('Description', { exact: true }).fill('AC is not cooling after a power fluctuation');
  await ccePage.getByRole('button', { name: 'Review ticket', exact: true }).click();
  await ccePage.getByRole('button', { name: 'Register', exact: true }).click();
  const success = ccePage.getByRole('dialog');
  await expect(success.getByRole('heading', { name: 'Ticket registered successfully' })).toBeVisible();
  const ticketNo = (await success.getByText(/^NCCW-/).textContent()).trim();
  await shot(ccePage, '01', 'cce-registered');
  const ticket = (await call(request, 'get', `/brand/tickets?q=${ticketNo}`, cce.auth.accessToken)).find(row => row.humanId === ticketNo);

  await warrantyPage.goto(`/brand-admin/tickets/${ticket.id}`);
  await expect(warrantyPage.getByText(ticketNo, { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await warrantyPage.getByRole('button', { name: 'Approve', exact: true }).click();
  const approval = warrantyPage.getByRole('dialog');
  await approval.getByLabel('Goodwill — brand pays').check();
  await approval.getByLabel('Goodwill justification', { exact: true }).fill('Approved for final client acceptance');
  await approval.getByRole('button', { name: 'Approve claim', exact: true }).click();
  await expect(warrantyPage.getByText('Job Created', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await shot(warrantyPage, '02', 'warranty-approved');

  const offer = partnerPage.getByRole('dialog');
  await expect(offer.getByText(ticketNo)).toBeVisible({ timeout: 20000 });
  await offer.getByRole('button', { name: /Accept job/i }).click();
  await expect(offer).toBeHidden({ timeout: 15000 });
  await shot(partnerPage, '03', 'partner-accepted');

  await adminPage.goto(`/super-admin/partner-warranty/claims/${ticket.id}`);
  await expect(adminPage.getByRole('heading', { name: 'Brand Ticket', exact: true })).toBeVisible({ timeout: 15000 });
  await shot(adminPage, '04', 'super-admin-linked-job');

  const detail = await call(request, 'get', `/brand/tickets/${ticket.id}`, owner.auth.accessToken);
  const activeJobs = await call(request, 'get', '/service-provider/jobs/active', partnerAuth.accessToken);
  const job = activeJobs.find(row => row.serviceRequest === detail.job.id || row.warranty?.claimId === ticketNo);
  for (const step of ['start-travel', 'arrive']) await call(request, 'post', `/service-provider/jobs/${job.id}/${step}`, partnerAuth.accessToken, {});
  await call(request, 'post', `/service-provider/jobs/${job.id}/diagnosis`, partnerAuth.accessToken, { notes: 'Fan motor failed' });
  await call(request, 'post', `/service-provider/jobs/${job.id}/request-part`, partnerAuth.accessToken, {
    partName: `Fan Motor ${tag}`,
    sku: `FM-${tag}`,
    price: 120,
    qty: 1,
    orderSource: 'Partner Brand'
  });
  await brandPage.goto(`/brand-admin/tickets/${ticket.id}`);
  await expect(brandPage.getByTestId('job-stage')).toHaveText('Parts Required', { timeout: 15000 });
  await shot(brandPage, '05', 'parts-required');
  let live = await call(request, 'get', `/brand/tickets/${ticket.id}`, spares.auth.accessToken);
  const part = live.parts[0];
  await call(request, 'post', `/brand/parts/${part.id}/approve`, spares.auth.accessToken, { remarks: 'Covered replacement approved' });
  await call(request, 'patch', `/super-admin/part-orders/${part.id}`, admin.auth.accessToken, { status: 'Approved' });
  await call(request, 'patch', `/super-admin/part-orders/${part.id}`, admin.auth.accessToken, { status: 'Dispatched' });
  await call(request, 'post', `/service-provider/jobs/${job.id}/parts/${part.id}/received`, partnerAuth.accessToken, {});
  await call(request, 'post', `/service-provider/jobs/${job.id}/parts/${part.id}/installed`, partnerAuth.accessToken, {});
  await brandPage.reload();
  await expect(brandPage.getByText('Installed', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await shot(brandPage, '06', 'part-installed');

  for (const step of ['start-travel', 'arrive']) await call(request, 'post', `/service-provider/jobs/${job.id}/${step}`, partnerAuth.accessToken, {});
  await call(request, 'post', `/service-provider/jobs/${job.id}/repair-complete`, partnerAuth.accessToken, {});
  await call(request, 'post', `/service-provider/jobs/${job.id}/billing`, partnerAuth.accessToken, {});
  const customerAuth = await session(request, 'customer', customerPhone);
  const customerPage = await pageFor(browser, customerAuth, '', { width: 390, height: 844 }); pages.push(customerPage);
  await customerPage.goto(`/partner-warranty/claims/${ticket.id}/track`);
  const tracking = await call(request, 'get', `/partner-warranty/claims/${ticket.id}/track`, customerAuth.accessToken);
  await call(request, 'post', `/service-provider/jobs/${job.id}/collect-payment`, partnerAuth.accessToken, { paymentMethod: 'Cash', otp: tracking.completionOtp });
  await call(request, 'post', `/partner-warranty/claims/${ticket.id}/confirm`, customerAuth.accessToken, {});
  await customerPage.reload();
  await expect(customerPage.getByText('This claim is closed. Thank you!')).toBeVisible({ timeout: 15000 });
  await shot(customerPage, '07', 'customer-closed');
  await brandPage.reload();
  await expect(brandPage.getByTestId('job-stage')).toHaveText('Closed');
  await shot(brandPage, '08', 'brand-closed');

  live = await call(request, 'get', `/brand/tickets/${ticket.id}`, owner.auth.accessToken);
  const closedAt = new Date(live.billing.closedAt);
  const invoice = await call(request, 'post', '/super-admin/brand-billing/invoices', admin.auth.accessToken, {
    brand: brand.id,
    periodFrom: new Date(closedAt.getTime() - 86400000).toISOString(),
    periodTo: new Date(closedAt.getTime() + 86400000).toISOString()
  });
  await call(request, 'post', `/super-admin/brand-billing/invoices/${invoice.id}/issue`, admin.auth.accessToken, {});
  await call(request, 'post', `/super-admin/brand-billing/invoices/${invoice.id}/payments`, admin.auth.accessToken, {
    amount: 100,
    mode: 'bank_transfer',
    reference: `PHASE19-${tag}`
  });
  await brandPage.goto('/brand-admin/invoices');
  await brandPage.getByRole('tab', { name: 'Invoices', exact: true }).click();
  await expect(brandPage.getByRole('button', { name: invoice.humanId, exact: true })).toBeVisible({ timeout: 15000 });
  await shot(brandPage, '09', 'billing-payment');
  await brandPage.goto('/brand-admin/reports');
  await expect(brandPage.getByRole('table')).toBeVisible({ timeout: 15000 });
  await shot(brandPage, '10', 'state-city-report');
  await brandPage.goto('/brand-admin/dashboard');
  await expect(brandPage.getByTestId('dashboard-total')).not.toHaveText('0');
  await shot(brandPage, '11', 'dashboard-kpis');

  await ccePage.goto('/brand-admin/warranty-claims');
  const nav = ccePage.locator('nav');
  await expect(nav.getByRole('link', { name: 'All Tickets' })).toBeVisible({ timeout: 15000 });
  await expect(nav.getByText('Finance & Billing')).toHaveCount(0);
  await expect(nav.getByRole('link', { name: /User & Role/ })).toHaveCount(0);
  await shot(ccePage, '12', 'cce-sidebar');
  await ccePage.goto('/brand-admin/call-rates');
  await expect(ccePage.getByRole('alert')).toContainText('You don’t have access to this page');
  await shot(ccePage, '13', 'cce-forbidden');

  await foreignPage.goto('/brand-admin/warranty-claims');
  await foreignPage.getByLabel('Search claims').fill(ticketNo);
  await expect(foreignPage.getByText(ticketNo, { exact: true })).toHaveCount(0);
  await shot(foreignPage, '14', 'foreign-brand-isolation');
  const forbidden = await request.get(`${API}/brand/tickets/${ticket.id}`, { headers: { Authorization: `Bearer ${foreign.auth.accessToken}` } });
  expect(forbidden.status()).toBe(404);

  for (const page of pages) await page.context().close();
});
