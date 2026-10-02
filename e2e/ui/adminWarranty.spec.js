import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// docs/partner-warranty Phase 14 in the browser: Super Admin's Partner
// Warranty module — the needs-attention view, manual assignment when nobody
// was found, escalate / hold / resume, partner eligibility, catalogue issues,
// SLA defaults, B2B2C settlement and the webhook log.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const SHOTS = fileURLToPath(new URL('../../docs/partner-warranty/screenshots/', import.meta.url));
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
const PDF = Buffer.from('%PDF-1.4\n%e2e\n');

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
async function upload(request, token) {
  const res = await request.post(`${API}/uploads`, { headers: { Authorization: `Bearer ${token}` }, multipart: { file: { name: 'invoice.pdf', mimeType: 'application/pdf', buffer: PDF } } });
  return (await res.json()).data.url;
}

const cleanups = [];
test.afterEach(async () => {
  for (const fn of cleanups.splice(0)) await fn().catch(() => {});
});

test('Super Admin runs a stuck warranty claim to settlement', async ({ browser, request }) => {
  test.setTimeout(240_000);
  const tag = randomUUID().slice(0, 6);
  const city = `Nagpur${tag}`;

  const adminEmail = `aw-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const adminSession = await session(request, 'super_admin', adminEmail);
  const admin = adminSession.accessToken;
  const ac = (await call(request, 'get', '/super-admin/catalogue/categories', admin)).find((c) => c.key === 'AC');
  const brand = await call(request, 'post', '/super-admin/brands', admin, { name: `E2E AW ${tag}`, status: 'Active' });
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin, { warrantyEnabled: true, coverage: [ac.id] });
  const group = await call(request, 'post', '/super-admin/warranty-catalog/groups', admin, { name: `E2E AW ${tag}`, slug: `aw-${tag}`, categories: [ac.id] });
  cleanups.push(() => call(request, 'put', `/super-admin/warranty-catalog/groups/${group.id}`, admin, { isActive: false }));
  const issue = await call(request, 'post', '/super-admin/warranty-catalog/issues', admin, { category: ac.id, name: `Tripping ${tag}` });

  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = (await session(request, 'customer', phone)).accessToken;
  const claim = await call(request, 'post', '/partner-warranty/claims', customer, {
    brandId: brand.id,
    categoryId: ac.id,
    issueId: issue.id,
    modelNumber: 'AS-Q18',
    serialNumber: `AW-${tag}`,
    purchaseDate: new Date(Date.now() - 30 * 864e5).toISOString(),
    address: { house: '7 Civil Lines', city, pincode: '440001' },
    documents: [{ kind: 'invoice', url: await upload(request, customer), name: 'invoice.pdf' }],
  });

  // Approved while no partner serves that city → allocation failed.
  await call(request, 'post', `/super-admin/warranty-claims/${claim.id}/approve`, admin, { reason: 'Brand asked NCC to approve' });

  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await signIn(page, adminSession, 'super_admin');
  await page.goto('/super-admin/partner-warranty/claims?view=allocation');
  await expect(page.getByRole('link', { name: claim.humanId })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('No partner').first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}phase-14-claims-attention.png` });

  // A partner who is offline in that city: the shortlist still offers them.
  const partnerPhone = uniquePhone();
  await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: partnerPhone, password: 'password123', specs: ['AC'], serviceCityName: city, availability: 'Offline' } });
  const partnerToken = (await session(request, 'service_provider', partnerPhone)).accessToken;

  await page.getByRole('link', { name: claim.humanId }).click();
  await expect(page.getByText('No partner found')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Brand approval' })).toBeVisible();

  // Escalate, hold, resume — each needs a reason and lands in the audit trail.
  await page.getByRole('button', { name: 'Escalate' }).click();
  await page.getByRole('dialog').getByLabel(/^Reason/).fill('Customer called twice');
  await page.getByRole('dialog').getByRole('button', { name: 'Escalate' }).click();
  await expect(page.getByText('Escalated', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Hold' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Put on hold' }).click();
  // Empty reason refused: the browser blocks the submit and the dialog stays.
  expect(await page.getByRole('dialog').getByLabel(/^Reason/).evaluate((el) => el.validity.valueMissing)).toBe(true);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByLabel(/^Reason/).fill('Customer away until Monday');
  await page.getByRole('dialog').getByRole('button', { name: 'Put on hold' }).click();
  await expect(page.getByText(/was Job Created/)).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('dialog').getByLabel(/^Reason/).fill('Customer back');
  await page.getByRole('dialog').getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Resumed.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Customer away until Monday' })).toBeVisible(); // audit trail

  // Re-dispatch on resume still finds nobody online → assign by hand.
  await expect(page.getByText('No partner found')).toBeVisible();
  await page.getByRole('button', { name: 'Assign partner' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio').first().check();
  await dialog.getByLabel(/^Reason/).fill('Called the partner, he will take it');
  await dialog.getByRole('button', { name: 'Assign' }).click();
  await expect(page.getByText('Partner assigned.')).toBeVisible();
  await expect(page.getByText('No partner found')).toHaveCount(0);
  await expect(page.getByText(/\(offered\)/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}phase-14-claim-detail.png`, fullPage: true });

  // The partner does the job; the payout waits for manual settlement.
  const srId = (await call(request, 'get', `/partner-warranty/claims/${claim.id}`, customer)).serviceRequestId;
  const job = await call(request, 'post', `/service-provider/jobs/accept/${srId}`, partnerToken, {});
  for (const step of ['start-travel', 'arrive']) await call(request, 'post', `/service-provider/jobs/${job.id}/${step}`, partnerToken);
  await call(request, 'post', `/service-provider/jobs/${job.id}/diagnosis`, partnerToken, { notes: 'ok' });
  await call(request, 'post', `/service-provider/jobs/${job.id}/spare-parts`, partnerToken, { parts: [] });
  await call(request, 'post', `/service-provider/jobs/${job.id}/repair-complete`, partnerToken);
  await call(request, 'post', `/service-provider/jobs/${job.id}/billing`, partnerToken);
  const otp = (await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, customer)).completionOtp;
  await call(request, 'post', `/service-provider/jobs/${job.id}/collect-payment`, partnerToken, { paymentMethod: 'Cash', otp });

  await page.goto('/super-admin/partner-warranty/payouts');
  // Other specs' partners share the default name — pick ours by phone.
  await page.getByRole('row').filter({ hasText: partnerPhone }).click();
  await expect(page.getByText(/Unsettled jobs/)).toBeVisible();
  await page.getByLabel(/Transfer reference/).fill(`UTR-${tag}`);
  await page.getByRole('button', { name: 'Record settlement' }).click();
  await expect(page.getByText(new RegExp(`reference UTR-${tag}`))).toBeVisible();

  // Partner eligibility: authorize them for this brand and a pincode.
  await page.goto('/super-admin/partner-warranty/partners');
  await page.getByLabel('Search partners').fill(partnerPhone);
  await page.getByRole('button', { name: new RegExp(partnerPhone) }).click();
  await page.getByRole('checkbox', { name: brand.name }).check();
  await page.getByLabel(/Service pincodes/).fill('440001, 440002');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved. Applies to the next warranty job offered.')).toBeVisible();
  const elig = await call(request, 'get', `/super-admin/warranty-catalog/service-providers/${job.serviceProvider}`, admin);
  expect(elig.authorizedBrands.map((b) => b.id)).toEqual([brand.id]);
  expect(elig.servicePincodes).toEqual(['440001', '440002']);

  // Catalogue: add an issue for AC.
  await page.goto('/super-admin/partner-warranty/catalogue?tab=issues');
  await page.getByLabel('Product').selectOption(ac.id);
  await page.getByLabel('New issue').fill(`Remote not working ${tag}`);
  await page.getByRole('button', { name: 'Add issue' }).click();
  await expect(page.getByLabel(`Issue name: Remote not working ${tag}`)).toBeVisible();

  // SLA page shows the brand; platform defaults are editable.
  await page.goto('/super-admin/partner-warranty/sla');
  await expect(page.getByRole('cell', { name: brand.name })).toBeVisible({ timeout: 15_000 });
  const approval = page.getByLabel('Brand approval');
  const before = await approval.inputValue();
  await approval.fill('30');
  await page.getByRole('button', { name: 'Save defaults' }).click();
  await expect(page.getByText(/New claims use these hours/)).toBeVisible();
  await call(request, 'put', '/super-admin/settings', admin, { warrantySla: { approvalHours: Number(before) || 24 } });

  await page.goto('/super-admin/partner-warranty/webhooks');
  await expect(page.getByRole('heading', { name: 'Brand Webhook Log' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Parts Claims' })).toBeVisible(); // renamed from "NCC Shield (Warranty)"
});
