import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// docs/partner-warranty Phase 15 in the browser: the service partner gets a
// warranty job offer (brand, product, issue, area, NCCJ ID, "Warranty
// Service", ₹0 to the customer), accepts it, schedules the visit, sees the
// customer's documents, and later finds the job under Earnings → InvoicePayout
// (B2B2C, settled manually by NCC) and History → Warranty (B2B2C).

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const SHOTS = fileURLToPath(new URL('../../docs/partner-warranty/screenshots/', import.meta.url));
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
const PDF = Buffer.from('%PDF-1.4\n%e2e\n');

async function session(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}
async function signIn(page, s) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [s.accessToken, s.refreshToken, JSON.stringify(s.user)]);
}
async function call(request, method, path, token, data) {
  const res = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`${method.toUpperCase()} ${path} → ${res.status()}: ${JSON.stringify(body.error)}`);
  return body.data;
}
async function upload(request, token) {
  const res = await request.post(`${API}/uploads`, { headers: { Authorization: `Bearer ${token}` }, multipart: { file: { name: 'invoice.pdf', mimeType: 'application/pdf', buffer: PDF } } });
  return (await res.json()).data.url;
}
function tomorrowIso() {
  const d = new Date(Date.now() + 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const cleanups = [];
test.afterEach(async () => {
  for (const fn of cleanups.splice(0)) await fn().catch(() => {});
});

test.use({ viewport: { width: 390, height: 844 } });

test('a service partner takes a warranty job from offer to NCC settlement', async ({ page, request }) => {
  test.setTimeout(240_000);
  const tag = randomUUID().slice(0, 6);
  const city = `Bhopal${tag}`;

  const adminEmail = `pa-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const admin = (await session(request, 'super_admin', adminEmail)).accessToken;
  const ac = (await call(request, 'get', '/super-admin/catalogue/categories', admin)).find((c) => c.key === 'AC');
  const brand = await call(request, 'post', '/super-admin/brands', admin, { name: `E2E PA ${tag}`, status: 'Active' });
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin, { warrantyEnabled: true, coverage: [ac.id] });
  const group = await call(request, 'post', '/super-admin/warranty-catalog/groups', admin, { name: `E2E PA ${tag}`, slug: `pa-${tag}`, categories: [ac.id] });
  cleanups.push(() => call(request, 'put', `/super-admin/warranty-catalog/groups/${group.id}`, admin, { isActive: false }));
  const issue = await call(request, 'post', '/super-admin/warranty-catalog/issues', admin, { category: ac.id, name: `Not cooling ${tag}` });

  // An online AC partner in the claim's city — the only one who can get it.
  const partnerPhone = uniquePhone();
  await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: partnerPhone, password: 'password123', specs: ['AC'], serviceCityName: city, availability: 'Available' } });
  const partner = await session(request, 'service_provider', partnerPhone);

  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = (await session(request, 'customer', phone)).accessToken;
  const claim = await call(request, 'post', '/partner-warranty/claims', customer, {
    brandId: brand.id,
    categoryId: ac.id,
    issueId: issue.id,
    modelNumber: 'AR18-PA',
    serialNumber: `PA-${tag}`,
    purchaseDate: new Date(Date.now() - 60 * 864e5).toISOString(),
    remarks: 'Blows warm air after 10 minutes',
    address: { house: '12 Lake View', city, pincode: '462001' },
    documents: [{ kind: 'invoice', url: await upload(request, customer), name: 'invoice.pdf' }],
  });

  await signIn(page, partner);
  await page.goto('/service-provider/dashboard');
  await expect(page.getByText(/Online · Accepting jobs/)).toBeVisible({ timeout: 15_000 });

  // Brand (here: NCC on its behalf) approves → the job is offered to this partner.
  await call(request, 'post', `/super-admin/warranty-claims/${claim.id}/approve`, admin, { reason: 'Approved for e2e' });
  const jobId = (await call(request, 'get', `/partner-warranty/claims/${claim.id}`, customer)).serviceJobId;

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByText('Warranty Service', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: `${brand.name} ${ac.name}` })).toBeVisible();
  await expect(dialog.getByText(`Not cooling ${tag}`)).toBeVisible();
  await expect(dialog.getByText(claim.humanId)).toBeVisible();
  await expect(dialog.getByText(jobId, { exact: true })).toBeVisible();
  expect(jobId).toMatch(/^NCCJ-\d{4}-\d{6}$/);
  await expect(dialog.getByText(`${city} · 462001`)).toBeVisible();
  await expect(dialog.getByText('₹0 · paid by NCC')).toBeVisible();
  await expect(dialog.getByText('You schedule the visit after accepting')).toBeVisible();
  await expect(dialog.getByLabel(/seconds left to respond/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}phase-15-offer.png` });

  await dialog.getByRole('button', { name: /Accept job/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Start Job' }).click();
  // "Start Job" opens the job, or — before the app knows which job is active —
  // a picker of accepted jobs first.
  const picker = page.getByRole('button', { name: /Brand Warranty/ });
  const visit = page.getByRole('heading', { name: 'Visit' });
  await expect(async () => {
    if (await picker.isVisible()) await picker.click();
    await expect(visit).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });

  // Assigned step: schedule the visit, see the claim and the customer's invoice.
  await expect(page.getByRole('heading', { name: 'Visit' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Customer documents (1)')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: /Bill \/ Invoice/ })).toHaveAttribute('href', /\/uploads\//);
  // Client #11: the accepted partner gets the street address and directions.
  await expect(page.getByText(`12 Lake View, ${city} 462001`).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open in Maps' }).first()).toHaveAttribute('href', /google\.com\/maps\/dir/);
  await expect(page.getByText(/Customer’s note\s*Blows warm air after 10 minutes/)).toBeVisible();
  await expect(page.getByText(/Customer pays ₹0 for this warranty repair/)).toBeVisible();
  await expect(page.getByText('LG-IN-8842')).toHaveCount(0);

  await page.getByRole('button', { name: 'Schedule visit' }).click();
  expect(await page.getByLabel('Date').evaluate((el) => el.validity.valueMissing)).toBe(true); // date required
  await page.getByLabel('Date').fill(tomorrowIso());
  await page.getByText('3 PM – 6 PM').click();
  await page.getByRole('button', { name: 'Schedule visit' }).click();
  await expect(page.getByRole('status').filter({ hasText: '3 PM – 6 PM' })).toBeVisible();
  const tracked = await call(request, 'get', `/partner-warranty/claims/${claim.id}`, customer);
  expect(tracked.status).toBe('Visit Scheduled');
  expect(tracked.visit).toMatchObject({ date: tomorrowIso(), slot: '3 PM – 6 PM' });
  await page.screenshot({ path: `${SHOTS}phase-15-assigned.png`, fullPage: true });

  // The partner finishes the job (API), the customer hands over the OTP.
  const job = (await call(request, 'get', '/service-provider/jobs/active', partner.accessToken)).find((j) => j.warranty?.claimId === claim.humanId);
  for (const step of ['start-travel', 'arrive']) await call(request, 'post', `/service-provider/jobs/${job.id}/${step}`, partner.accessToken);
  await call(request, 'post', `/service-provider/jobs/${job.id}/diagnosis`, partner.accessToken, { notes: 'Low gas' });
  await call(request, 'post', `/service-provider/jobs/${job.id}/spare-parts`, partner.accessToken, { parts: [] });
  await call(request, 'post', `/service-provider/jobs/${job.id}/repair-complete`, partner.accessToken);
  await call(request, 'post', `/service-provider/jobs/${job.id}/billing`, partner.accessToken);
  const otp = (await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, customer)).completionOtp;
  await call(request, 'post', `/service-provider/jobs/${job.id}/collect-payment`, partner.accessToken, { paymentMethod: 'Cash', otp });

  // Earnings → InvoicePayout: B2B2C totals, by brand and product; no request button for it.
  await page.goto('/service-provider/earnings?tab=invoice');
  const panel = page.getByRole('region', { name: 'Partner Warranty (B2B2C)' });
  await expect(panel.getByText('Settled manually by NCC')).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText('By brand')).toBeVisible();
  await expect(panel.getByText(brand.name, { exact: true })).toBeVisible();
  await expect(panel.getByText('By product')).toBeVisible();
  await expect(panel.getByText('Awaiting NCC settlement')).toBeVisible();
  await expect(panel.getByRole('button')).toHaveCount(0);

  await call(request, 'post', '/super-admin/b2b2c-payouts/settle', admin, { serviceProviderId: job.serviceProvider, jobIds: [job.id], reference: `UTR-${tag}` });
  await page.reload();
  await expect(panel.getByText(new RegExp(`Settled .* · UTR-${tag}`))).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`NCC settlement · UTR-${tag}`)).toBeVisible(); // recent payouts, not "Job Direct"
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}phase-15-earnings.png`, fullPage: true });

  // History → Warranty (B2B2C).
  await page.goto('/service-provider/history');
  await page.getByRole('button', { name: 'Warranty (B2B2C)', exact: true }).click();
  const card = page.getByRole('button', { name: new RegExp(`Warranty: ${ac.name} — Not cooling ${tag}`) });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText('Warranty (B2B2C)');

  // Client #16: the offer reached the partner's notifications, not only the pop-up.
  await page.goto('/service-provider/notifications');
  await expect(page.getByText('New Warranty Job').first()).toBeVisible({ timeout: 15_000 });
});
