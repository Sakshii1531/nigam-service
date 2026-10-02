import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// docs/partner-warranty Phase 12 in the browser: a customer raises a real
// Partner Warranty claim through the approved screens, answers the brand's
// request for more information, follows the job live on Track Ticket, and
// closes it. The brand, NCC and the service partner act through their APIs.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const SHOTS = fileURLToPath(new URL('../../docs/partner-warranty/screenshots/', import.meta.url));
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
const PDF = Buffer.from('%PDF-1.4\n%e2e invoice\n');

async function session(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}

async function signIn(page, s, portal) {
  await page.addInitScript(([a, r, u, p]) => {
    const suffix = p ? `_${p}` : '';
    localStorage.setItem(`ncc_access_token${suffix}`, a);
    localStorage.setItem(`ncc_refresh_token${suffix}`, r);
    if (u) localStorage.setItem(`ncc_user${suffix}`, u);
  }, [s.accessToken, s.refreshToken, s.user ? JSON.stringify(s.user) : '', portal || '']);
}

async function call(request, method, path, token, data) {
  const res = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`${method.toUpperCase()} ${path} → ${res.status()}: ${JSON.stringify(body.error)}`);
  return body.data;
}

const cleanups = [];
test.afterEach(async () => {
  for (const fn of cleanups.splice(0)) await fn().catch(() => {});
});

test('a customer raises, answers, tracks and closes a Partner Warranty claim', async ({ browser, request }) => {
  test.setTimeout(180_000);
  const tag = randomUUID().slice(0, 6);

  // ── NCC sets up a partner brand that covers AC ──
  const adminEmail = `pw-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const admin = (await session(request, 'super_admin', adminEmail)).accessToken;
  const brand = await call(request, 'post', '/super-admin/brands', admin, { name: `E2E Cool ${tag}`, status: 'Active' });
  const ac = (await call(request, 'get', '/super-admin/catalogue/categories', admin)).find((c) => c.key === 'AC');
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin, { warrantyEnabled: true, coverage: [ac.id] });
  const groupName = `E2E Care ${tag}`;
  const group = await call(request, 'post', '/super-admin/warranty-catalog/groups', admin, { name: groupName, slug: `e2e-${tag}`, tagline: 'Test group', categories: [ac.id] });
  // Groups aren't purged by the suite's teardown; switch this one off afterwards.
  cleanups.push(() => call(request, 'put', `/super-admin/warranty-catalog/groups/${group.id}`, admin, { isActive: false }));
  const issueName = `Not Cooling ${tag}`;
  await call(request, 'post', '/super-admin/warranty-catalog/issues', admin, { category: ac.id, name: issueName });

  const brandEmail = `pw-brand-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email: brandEmail, password: 'password123', brand: brand.id } });
  const brandToken = (await session(request, 'brand_admin', brandEmail)).accessToken;

  const partnerPhone = uniquePhone();
  await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: partnerPhone, password: 'password123', specs: ['AC'], serviceCityName: `Indore${tag}` } });
  const partnerToken = (await session(request, 'service_provider', partnerPhone)).accessToken;

  // ── The customer, on a phone ──
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = await session(request, 'customer', phone);
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signIn(page, customer);

  await page.goto('/partner-warranty');
  await expect(page.getByRole('button', { name: new RegExp(groupName) })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800); // let the cards finish fading in
  await page.screenshot({ path: `${SHOTS}phase-12-landing.png`, fullPage: true });
  await page.getByRole('button', { name: new RegExp(groupName) }).click();
  await page.getByRole('button', { name: new RegExp(brand.name) }).click();
  await page.getByRole('button', { name: new RegExp(`^${ac.name}$`) }).click();
  await page.getByRole('button', { name: new RegExp(issueName) }).click();

  await expect(page.getByRole('heading', { name: 'Raise Warranty Request' })).toBeVisible();
  // Submitting without the invoice is refused on the page.
  await page.getByLabel(/Model Number/).fill('AS-Q18');
  await page.getByLabel(/Serial Number/).fill(`SN-${tag}`);
  await page.getByLabel(/Purchase Date/).fill(new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10));
  await page.getByLabel(/Description of Issue/).fill('Blows warm air since Monday');
  await page.getByLabel(/House \/ Street/).fill('12 MG Road');
  await page.getByLabel(/^City/).fill(`Indore${tag}`);
  await page.getByLabel(/Pincode/).fill('452001');
  await page.getByRole('button', { name: 'Raise Ticket' }).click();
  await expect(page.getByText('Please upload the purchase bill / invoice.')).toBeVisible();

  await page.locator('input[type=file]').first().setInputFiles({ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(page.getByRole('button', { name: 'Remove Bill / Invoice' })).toBeVisible();
  await expect(page.getByText('Please upload the purchase bill / invoice.')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}phase-12-raise-request.png`, fullPage: true });
  await page.getByRole('button', { name: 'Raise Ticket' }).click();

  await expect(page.getByRole('heading', { name: 'Ticket Raised Successfully!' })).toBeVisible({ timeout: 15_000 });
  const ticket = (await page.getByText(/^NCCW-\d{4}-\d{6}$/).textContent()).trim();
  expect(ticket).toMatch(new RegExp(`^NCCW-${new Date().getFullYear()}-\\d{6}$`));
  await page.screenshot({ path: `${SHOTS}phase-12-ticket-success.png`, fullPage: true });

  // ── Track Ticket updates live when the brand asks for more information ──
  await page.getByRole('button', { name: 'Track Ticket' }).click();
  await expect(page.getByText('Your claim has been sent to the brand.')).toBeVisible();
  const claimId = (await call(request, 'get', `/partner-warranty/claims/${ticket}`, customer.accessToken)).id;
  await call(request, 'post', `/brand/warranty-claims/${claimId}/request-info`, brandToken, { message: 'Please upload a photo of the serial sticker' });
  const banner = page.getByRole('link', { name: /needs more information/ });
  await expect(banner).toBeVisible({ timeout: 10_000 }); // pushed, no reload

  await banner.click();
  await expect(page.getByText('“Please upload a photo of the serial sticker”')).toBeVisible();
  await page.getByLabel('Your reply').fill('Sticker photo attached');
  await page.locator('form').filter({ hasText: 'Your reply' }).locator('input[type=file]').setInputFiles({ name: 'sticker.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(page.getByRole('button', { name: 'Remove sticker.pdf' })).toBeVisible();
  await page.getByRole('button', { name: 'Send to brand' }).click();
  await expect(page.getByText('Brand Verification').first()).toBeVisible({ timeout: 10_000 });

  // ── The brand approves; a partner accepts; the customer sees it live ──
  await page.getByRole('link', { name: 'Track this ticket' }).click();
  await call(request, 'post', `/brand/warranty-claims/${claimId}/approve`, brandToken, {});
  await expect(page.getByText('We are assigning a service technician near you.')).toBeVisible({ timeout: 10_000 });
  const srId = (await call(request, 'get', `/partner-warranty/claims/${claimId}`, customer.accessToken)).serviceRequestId;
  const job = await call(request, 'post', `/service-provider/jobs/accept/${srId}`, partnerToken, {});
  await expect(page.getByText('Your technician')).toBeVisible({ timeout: 10_000 });

  for (const step of ['start-travel', 'arrive']) await call(request, 'post', `/service-provider/jobs/${job.id}/${step}`, partnerToken);
  await expect(page.getByText('The technician is working on your product.')).toBeVisible({ timeout: 10_000 });
  await call(request, 'post', `/service-provider/jobs/${job.id}/diagnosis`, partnerToken, { notes: 'Gas leak fixed' });
  await call(request, 'post', `/service-provider/jobs/${job.id}/spare-parts`, partnerToken, { parts: [] });
  await call(request, 'post', `/service-provider/jobs/${job.id}/repair-complete`, partnerToken);
  await call(request, 'post', `/service-provider/jobs/${job.id}/billing`, partnerToken);

  // The customer reads the completion code on screen and gives it to the technician.
  const otp = (await page.getByLabel(/^Completion code/).textContent()).trim();
  await call(request, 'post', `/service-provider/jobs/${job.id}/collect-payment`, partnerToken, { paymentMethod: 'Cash', otp });
  const done = page.getByRole('button', { name: 'Service done — close my claim' });
  await expect(done).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: `${SHOTS}phase-12-track-completed.png`, fullPage: true });
  await done.click();
  await expect(page.getByText('This claim is closed. Thank you!')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel(/^Completion code/)).toHaveCount(0); // used up — no longer shown
  await expect(page.getByRole('link', { name: 'Rate your service' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}phase-12-track-closed.png`, fullPage: true });

  // The list shows it under Past.
  await page.goto('/partner-warranty/claims');
  await page.getByRole('tab', { name: 'Past' }).click();
  await expect(page.getByText(ticket)).toBeVisible();
});
