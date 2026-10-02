import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// docs/partner-warranty Phase 16 — the client's flow (#19) across all four
// apps at once, each in its own browser: the customer raises a claim → Super
// Admin sees it arrive (live) → the brand approves in its panel → NCC's Service
// Job is offered to the partner, who accepts and schedules the visit → the
// customer follows it live and closes the claim → brand and NCC see it closed
// → NCC settles the partner's B2B2C payout, which the partner then sees.
// Only the partner's on-site steps (travel … collect) run through the API —
// their screens are covered by the job-flow specs.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const SHOTS = fileURLToPath(new URL('../../docs/partner-warranty/screenshots/', import.meta.url));
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
const PDF = Buffer.from('%PDF-1.4\n%e2e invoice\n');
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

async function session(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}
async function call(request, method, path, token, data) {
  const res = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`${method.toUpperCase()} ${path} → ${res.status()}: ${JSON.stringify(body.error)}`);
  return body.data;
}
/** A page in its own browser context, signed in to `portal` ('' = the default session). */
async function appPage(browser, s, portal, viewport) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.addInitScript(([a, r, u, p]) => {
    const suffix = p ? `_${p}` : '';
    localStorage.setItem(`ncc_access_token${suffix}`, a);
    localStorage.setItem(`ncc_refresh_token${suffix}`, r);
    if (u) localStorage.setItem(`ncc_user${suffix}`, u);
  }, [s.accessToken, s.refreshToken, s.user ? JSON.stringify(s.user) : '', portal]);
  return page;
}
const shot = (page, name, fullPage = false) => page.screenshot({ path: `${SHOTS}phase-16-${name}.png`, fullPage });
function tomorrowIso() {
  const d = new Date(Date.now() + 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const cleanups = [];
test.afterEach(async () => {
  for (const fn of cleanups.splice(0)) await fn().catch(() => {});
});

test('one warranty claim through the customer, Super Admin, brand and partner apps', async ({ browser, request }) => {
  test.setTimeout(300_000);
  const tag = randomUUID().slice(0, 6);
  const city = `Jaipur${tag}`;

  // ── NCC's setup: a partner brand covering AC, its catalogue, its staff, one partner ──
  const adminEmail = `wj-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const adminSession = await session(request, 'super_admin', adminEmail);
  const admin = adminSession.accessToken;
  const ac = (await call(request, 'get', '/super-admin/catalogue/categories', admin)).find((c) => c.key === 'AC');
  const brand = await call(request, 'post', '/super-admin/brands', admin, { name: `E2E Journey ${tag}`, status: 'Active' });
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin, { warrantyEnabled: true, coverage: [ac.id] });
  const groupName = `E2E Journey ${tag}`;
  const group = await call(request, 'post', '/super-admin/warranty-catalog/groups', admin, { name: groupName, slug: `wj-${tag}`, tagline: 'Journey', categories: [ac.id] });
  cleanups.push(() => call(request, 'put', `/super-admin/warranty-catalog/groups/${group.id}`, admin, { isActive: false }));
  const issueName = `Not Cooling ${tag}`;
  await call(request, 'post', '/super-admin/warranty-catalog/issues', admin, { category: ac.id, name: issueName });

  const brandEmail = `wj-brand-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email: brandEmail, password: 'password123', brand: brand.id } });
  const brandSession = await session(request, 'brand_admin', brandEmail);

  const partnerPhone = uniquePhone();
  await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: partnerPhone, password: 'password123', specs: ['AC'], serviceCityName: city, availability: 'Available' } });
  const partnerSession = await session(request, 'service_provider', partnerPhone);

  const customerPhone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone: customerPhone, password: 'password123' } });
  const customerSession = await session(request, 'customer', customerPhone);

  // ── Four apps, four browsers ──
  const adminPage = await appPage(browser, adminSession, 'super_admin', DESKTOP);
  await adminPage.goto('/super-admin/partner-warranty/claims');
  await expect(adminPage.getByRole('heading', { name: 'Partner Warranty Claims' })).toBeVisible({ timeout: 15_000 });

  const partnerPage = await appPage(browser, partnerSession, '', PHONE);
  await partnerPage.goto('/service-provider/dashboard');
  await expect(partnerPage.getByText(/Online · Accepting jobs/)).toBeVisible({ timeout: 15_000 });

  const customer = await appPage(browser, customerSession, '', PHONE);

  // ── 1. Customer: brand → product → issue → documents → details → submit ──
  await customer.goto('/partner-warranty');
  await customer.getByRole('button', { name: new RegExp(groupName) }).click({ timeout: 15_000 });
  await customer.getByRole('button', { name: new RegExp(brand.name) }).click();
  await customer.getByRole('button', { name: new RegExp(`^${ac.name}$`) }).click();
  await customer.getByRole('button', { name: new RegExp(issueName) }).click();
  await expect(customer.getByRole('heading', { name: 'Raise Warranty Request' })).toBeVisible();
  await customer.getByLabel(/Model Number/).fill('AR18-WJ');
  await customer.getByLabel(/Serial Number/).fill(`WJ-${tag}`);
  await customer.getByLabel(/Purchase Date/).fill(new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10));
  await customer.getByLabel(/Description of Issue/).fill('Cooling stops after an hour');
  await customer.getByLabel(/House \/ Street/).fill('4 Civil Lines');
  await customer.getByLabel(/^City/).fill(city);
  await customer.getByLabel(/Pincode/).fill('302001');
  await customer.locator('input[type=file]').first().setInputFiles({ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(customer.getByRole('button', { name: 'Remove Bill / Invoice' })).toBeVisible();
  await customer.getByRole('button', { name: 'Raise Ticket' }).click();
  await expect(customer.getByRole('heading', { name: 'Ticket Raised Successfully!' })).toBeVisible({ timeout: 15_000 });
  const ticket = (await customer.getByText(/^NCCW-\d{4}-\d{6}$/).textContent()).trim();
  await shot(customer, '01-customer-submitted');

  // ── 2. Super Admin: the claim appears on the open list without a reload ──
  const adminRow = adminPage.getByRole('link', { name: ticket });
  await expect(adminRow).toBeVisible({ timeout: 15_000 });
  await expect(adminPage.getByRole('row').filter({ hasText: ticket })).toContainText(brand.name);
  await expect(adminPage.getByRole('row').filter({ hasText: ticket })).toContainText('Submitted');
  await shot(adminPage, '02-admin-sees-claim');

  // The customer follows it on Track Ticket from here on.
  await customer.getByRole('button', { name: 'Track Ticket' }).click();
  await expect(customer.getByText('Your claim has been sent to the brand.')).toBeVisible({ timeout: 15_000 });

  // ── 3. Brand: opens the claim in its panel, sees the documents, approves ──
  const brandPage = await appPage(browser, brandSession, 'brand_admin', DESKTOP);
  await brandPage.goto('/brand-admin/warranty-claims');
  await brandPage.getByRole('link', { name: ticket }).click({ timeout: 15_000 });
  await expect(brandPage.getByRole('heading', { name: 'Documents (1)' })).toBeVisible({ timeout: 15_000 });
  await expect(brandPage.getByRole('button', { name: /Bill \/ Invoice/ })).toBeVisible();
  await brandPage.getByRole('button', { name: 'Approve' }).click();
  await brandPage.getByRole('dialog').getByLabel(/Remarks/).fill('Within warranty — approved');
  await shot(brandPage, '03-brand-approve');
  await brandPage.getByRole('dialog').getByRole('button', { name: 'Approve claim' }).click();
  await expect(brandPage.getByText('Claim approved — a Service Job has been created.')).toBeVisible({ timeout: 15_000 });
  const jobNumber = (await brandPage.getByText(/^NCCJ-\d{4}-\d{6}$/).first().textContent()).trim();

  // ── 4. Network → partner: the offer pops up on the partner's phone ──
  const offer = partnerPage.getByRole('dialog');
  await expect(offer).toBeVisible({ timeout: 20_000 });
  await expect(offer.getByText('Warranty Service', { exact: true })).toBeVisible();
  await expect(offer.getByText(jobNumber, { exact: true })).toBeVisible();
  await expect(offer.getByText(ticket)).toBeVisible();
  await expect(offer.getByText('₹0 · paid by NCC')).toBeVisible();
  await shot(partnerPage, '04-partner-offer');
  await offer.getByRole('button', { name: /Accept job/i }).click();
  await expect(offer).toBeHidden({ timeout: 15_000 });

  // The customer sees the technician without reloading.
  await expect(customer.getByText('Your technician')).toBeVisible({ timeout: 15_000 });

  // ── 5. Partner: schedules the visit; the customer sees the slot live ──
  await partnerPage.getByRole('button', { name: 'Start Job' }).click();
  const picker = partnerPage.getByRole('button', { name: /Brand Warranty/ });
  const visit = partnerPage.getByRole('heading', { name: 'Visit' });
  await expect(async () => {
    if (await picker.isVisible()) await picker.click();
    await expect(visit).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await partnerPage.getByLabel('Date').fill(tomorrowIso());
  await partnerPage.getByText('9 AM – 12 PM').click();
  await partnerPage.getByRole('button', { name: 'Schedule visit' }).click();
  await expect(partnerPage.getByRole('status').filter({ hasText: '9 AM – 12 PM' })).toBeVisible({ timeout: 15_000 });
  await shot(partnerPage, '05-partner-visit');
  await expect(customer.getByRole('listitem').filter({ hasText: /Visit Scheduled.*current step/ })).toBeVisible({ timeout: 15_000 });
  await expect(customer.getByText(/9 AM – 12 PM/).first()).toBeVisible();
  await shot(customer, '06-customer-tracking', true);

  // ── 6. Execution (partner's on-site steps), then the customer closes the claim ──
  const job = (await call(request, 'get', '/service-provider/jobs/active', partnerSession.accessToken)).find((j) => j.warranty?.claimId === ticket);
  for (const step of ['start-travel', 'arrive']) await call(request, 'post', `/service-provider/jobs/${job.id}/${step}`, partnerSession.accessToken);
  await expect(customer.getByText('The technician is working on your product.')).toBeVisible({ timeout: 15_000 });
  await call(request, 'post', `/service-provider/jobs/${job.id}/diagnosis`, partnerSession.accessToken, { notes: 'Capacitor replaced' });
  await call(request, 'post', `/service-provider/jobs/${job.id}/spare-parts`, partnerSession.accessToken, { parts: [] });
  await call(request, 'post', `/service-provider/jobs/${job.id}/repair-complete`, partnerSession.accessToken);
  await call(request, 'post', `/service-provider/jobs/${job.id}/billing`, partnerSession.accessToken);
  const otp = (await customer.getByLabel(/^Completion code/).textContent({ timeout: 15_000 })).trim();
  await call(request, 'post', `/service-provider/jobs/${job.id}/collect-payment`, partnerSession.accessToken, { paymentMethod: 'Cash', otp });
  const done = customer.getByRole('button', { name: 'Service done — close my claim' });
  await expect(done).toBeVisible({ timeout: 15_000 });
  await done.click();
  await expect(customer.getByText('This claim is closed. Thank you!')).toBeVisible({ timeout: 15_000 });
  await shot(customer, '07-customer-closed', true);

  // "Rate your service" rates this claim's job — no made-up score when unrated.
  await customer.getByRole('link', { name: 'Rate your service' }).click();
  await expect(customer.getByText(ticket)).toBeVisible();
  await customer.getByRole('button', { name: 'Submit Rating' }).click();
  await expect(customer.getByRole('alert')).toHaveText('Please rate your overall experience.');
  await customer.getByRole('button', { name: 'Overall Experience: 5 stars' }).click();
  await customer.getByRole('button', { name: 'Service Provider Behavior: 4 stars' }).click();
  await customer.getByRole('button', { name: 'Submit Rating' }).click();
  await expect(customer.getByText('Thanks for your feedback!')).toBeVisible({ timeout: 15_000 });

  // ── 7. Three-way sync: brand and NCC see the same end state ──
  await expect(brandPage.getByText('Closed').first()).toBeVisible({ timeout: 15_000 });
  await shot(brandPage, '08-brand-closed', true);
  await adminRow.click();
  await expect(adminPage.getByRole('heading', { name: 'Warranty Claim', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(adminPage.getByRole('heading', { name: 'Audit trail (11)' })).toBeVisible();
  await expect(adminPage.getByText('Closed').first()).toBeVisible();
  await expect(adminPage.getByText(jobNumber).first()).toBeVisible();
  await shot(adminPage, '09-admin-closed', true);

  // ── 8. NCC settles the partner's B2B2C payout; the partner sees it ──
  await adminPage.goto('/super-admin/partner-warranty/payouts');
  await adminPage.getByRole('row').filter({ hasText: partnerPhone }).click({ timeout: 15_000 });
  await adminPage.getByLabel(/Transfer reference/).fill(`UTR-${tag}`);
  await adminPage.getByRole('button', { name: 'Record settlement' }).click();
  await expect(adminPage.getByText(new RegExp(`reference UTR-${tag}`))).toBeVisible({ timeout: 15_000 });

  await partnerPage.goto('/service-provider/earnings?tab=invoice');
  const b2b2c = partnerPage.getByRole('region', { name: 'Partner Warranty (B2B2C)' });
  await expect(b2b2c.getByText(new RegExp(`Settled .* · UTR-${tag}`))).toBeVisible({ timeout: 15_000 });
  await expect(b2b2c.getByText(brand.name, { exact: true })).toBeVisible();
  await b2b2c.scrollIntoViewIfNeeded();
  await shot(partnerPage, '10-partner-settled');
});
