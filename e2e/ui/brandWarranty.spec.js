import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// docs/partner-warranty Phase 13 in the browser: a brand's Warranty Claims
// queue and claim screen — only its own claims, request more information
// (the customer's answer arrives live), reject needs a reason, approve creates
// the Service Job, internal notes stay internal; plus Warranty Settings.

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

async function upload(request, token, name) {
  const res = await request.post(`${API}/uploads`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { file: { name, mimeType: 'application/pdf', buffer: PDF } },
  });
  return (await res.json()).data.url;
}

const cleanups = [];
test.afterEach(async () => {
  for (const fn of cleanups.splice(0)) await fn().catch(() => {});
});

test('a brand reviews its warranty claims: request info, reject needs a reason, approve, notes, settings', async ({ browser, request }) => {
  test.setTimeout(180_000);
  const tag = randomUUID().slice(0, 6);

  const adminEmail = `bw-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const admin = (await session(request, 'super_admin', adminEmail)).accessToken;
  const ac = (await call(request, 'get', '/super-admin/catalogue/categories', admin)).find((c) => c.key === 'AC');
  const makeBrand = async (name) => {
    const b = await call(request, 'post', '/super-admin/brands', admin, { name, status: 'Active' });
    await call(request, 'put', `/super-admin/warranty-catalog/brands/${b.id}`, admin, { warrantyEnabled: true, coverage: [ac.id] });
    return b;
  };
  const brand = await makeBrand(`E2E Brand ${tag}`);
  const other = await makeBrand(`E2E Other ${tag}`);
  const group = await call(request, 'post', '/super-admin/warranty-catalog/groups', admin, { name: `E2E BW ${tag}`, slug: `bw-${tag}`, categories: [ac.id] });
  cleanups.push(() => call(request, 'put', `/super-admin/warranty-catalog/groups/${group.id}`, admin, { isActive: false }));
  const issue = await call(request, 'post', '/super-admin/warranty-catalog/issues', admin, { category: ac.id, name: `Leaking ${tag}` });

  const brandEmail = `bw-brand-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email: brandEmail, password: 'password123', brand: brand.id } });
  const brandSession = await session(request, 'brand_admin', brandEmail);

  // Two customers' claims: one for this brand, one for another brand.
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = (await session(request, 'customer', phone)).accessToken;
  const submit = async (brandId, serial) =>
    call(request, 'post', '/partner-warranty/claims', customer, {
      brandId,
      categoryId: ac.id,
      issueId: issue.id,
      modelNumber: 'AS-Q18',
      serialNumber: serial,
      purchaseDate: new Date(Date.now() - 60 * 864e5).toISOString(),
      remarks: 'Water drips from the indoor unit',
      address: { house: '4 Park St', city: `Pune${tag}`, pincode: '411001' },
      documents: [{ kind: 'invoice', url: await upload(request, customer, 'invoice.pdf'), name: 'invoice.pdf' }],
    });
  const mine = await submit(brand.id, `BW-${tag}`);
  const theirs = await submit(other.id, `OT-${tag}`);

  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await signIn(page, brandSession, 'brand_admin');
  await page.goto('/brand-admin/warranty-claims');
  await expect(page.getByRole('link', { name: mine.humanId })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(theirs.humanId)).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /New\s*1/ })).toBeVisible();
  await expect(page.getByText(/due in \d+h/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}phase-13-queue.png` });

  // Open it → Brand Review; ask for more information.
  await page.getByRole('link', { name: mine.humanId }).click();
  await expect(page.getByText('Brand Review', { exact: true })).toBeVisible();
  await expect(page.getByText('Documents (1)')).toBeVisible();
  await page.getByRole('button', { name: 'Request more information' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/What do you need/).fill('Please send a photo of the leak');
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('Request sent to the customer.')).toBeVisible();
  await expect(page.getByText('Waiting for the customer…')).toBeVisible();

  // The customer answers from their app → shows up here without a reload.
  const photo = await upload(request, customer, 'leak.pdf');
  await call(request, 'post', `/partner-warranty/claims/${mine.id}/info-response`, customer, {
    message: 'Here is the leak',
    documents: [{ kind: 'additional', url: photo, name: 'leak.pdf' }],
  });
  await expect(page.getByText('Customer replied')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Documents (2)')).toBeVisible();

  // Reject needs a reason: an empty submit is refused and nothing changes.
  await page.getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reject claim' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Brand Review', { exact: true })).toBeVisible();

  // An internal note stays brand-only.
  await page.getByLabel('Internal note').fill('Leak photo looks genuine');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('Leak photo looks genuine')).toBeVisible();
  await expect(page.getByText('brand only').first()).toBeVisible();

  // Approve → NCC creates the Service Job.
  await page.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('dialog').getByLabel(/Remarks/).fill('Covered — manufacturing defect');
  await page.getByRole('dialog').getByRole('button', { name: 'Approve claim' }).click();
  await expect(page.getByText('Claim approved — a Service Job has been created.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^NCCJ-\d{4}-\d{6}$/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}phase-13-claim-approved.png`, fullPage: true });

  // The customer never sees the note.
  const customerView = await call(request, 'get', `/partner-warranty/claims/${mine.id}`, customer);
  expect(JSON.stringify(customerView)).not.toContain('looks genuine');

  // Warranty Settings: coverage listed; saving a webhook issues the secret once; the test ping reports failure for a dead endpoint.
  await page.goto('/brand-admin/warranty-settings');
  await expect(page.getByText('Your brand is listed in the customer app’s Partner Warranty.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: ac.name, exact: true })).toBeChecked();
  await page.getByLabel('Endpoint URL').fill('http://127.0.0.1:9/ncc-hook');
  await page.getByLabel('Send events').check();
  await page.getByRole('button', { name: 'Save webhook' }).click();
  await expect(page.getByText(/Signing secret — copy it now/)).toBeVisible();
  await expect(page.locator('code')).toHaveText(/^[a-f0-9]{64}$/);
  await page.getByRole('button', { name: 'Send test' }).click();
  await expect(page.getByText(/^Test failed:/)).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}phase-13-settings.png`, fullPage: true });

  // Parts claims still have their own (read-only) page.
  await page.goto('/brand-admin/parts-claims');
  await expect(page.getByText('Parts Claims & Extended Warranty')).toBeVisible();
});
