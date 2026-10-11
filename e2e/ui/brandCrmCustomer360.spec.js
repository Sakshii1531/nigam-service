import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const API = 'http://localhost:4111/api/v1';
const shots = fileURLToPath(new URL('../../docs/brand-crm/screenshots/', import.meta.url));
fs.mkdirSync(shots, { recursive: true });
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
async function call(request, method, path, token, data) {
  const res = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`${method} ${path}: ${JSON.stringify(body.error)}`);
  return body.data;
}
async function session(request, role, identifier) {
  await request.post(`${API}/auth/otp/send`, { data: { role, identifier } });
  const otp = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return call(request, 'post', '/auth/otp/verify', '', { role, identifier, code: otp });
}
async function setup(request, template = 'cce') {
  const tag = randomUUID().slice(0, 8);
  const email = `crm360-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await session(request, 'super_admin', email);
  const category = (await call(request, 'get', '/super-admin/catalogue/categories', admin.accessToken)).find(c => c.key === 'AC');
  const brand = await call(request, 'post', '/super-admin/brands', admin.accessToken, { name: `E2E Customer 360 ${tag}`, status: 'Active' });
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin.accessToken, { warrantyEnabled: true, coverage: [category.id] });
  const issue = await call(request, 'post', '/super-admin/warranty-catalog/issues', admin.accessToken, { category: category.id, name: `CRM issue ${tag}` });
  const staffEmail = `crm360-${template}-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email: staffEmail, password: 'password123', brand: brand.id, brandRoleTemplate: template, employeeId: 'CCE-360' } });
  return { tag, brand, category, issue, staff: await session(request, 'brand_admin', staffEmail) };
}
async function signIn(page, s) {
  await page.addInitScript(s => {
    localStorage.setItem('ncc_access_token_brand_admin', s.accessToken);
    localStorage.setItem('ncc_refresh_token_brand_admin', s.refreshToken);
    localStorage.setItem('ncc_user_brand_admin', JSON.stringify(s.user));
  }, s);
}

test('CCE creates, searches and edits a real Customer 360 profile with brand product/ticket history', async ({ page, request }) => {
  test.setTimeout(120000);
  const w = await setup(request);
  await signIn(page, w.staff);
  await page.goto('/brand-admin/customers');
  await page.getByRole('button', { name: 'New customer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const mobile = phone();
  const name = `E2E Asha ${w.tag}`;
  await dialog.getByLabel('Name', { exact: true }).fill(name);
  await dialog.getByLabel('Mobile number', { exact: true }).fill(`+91 ${mobile}`);
  await dialog.getByLabel('House / street').fill('12 Park Street');
  await dialog.getByLabel('City', { exact: true }).fill('Surat');
  await dialog.getByLabel('State', { exact: true }).fill('Gujarat');
  await dialog.getByLabel('Pincode', { exact: true }).fill('395001');
  await dialog.getByRole('button', { name: 'Create customer', exact: true }).click();
  await expect(page).toHaveURL(/brand-admin\/customers\/[a-f0-9]{24}/);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  const id = page.url().split('/').pop();
  await expect(page.getByText('12 Park Street, Surat, Gujarat, 395001')).toBeVisible();
  await page.getByRole('button', { name: 'Edit customer', exact: true }).click();
  await expect(dialog.getByLabel('Mobile number', { exact: true })).toBeDisabled();
  await dialog.getByLabel('Alternate mobile', { exact: true }).fill('9000000000');
  await dialog.getByLabel('Email', { exact: true }).fill(`asha-${w.tag}@e2e.test`);
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText(`asha-${w.tag}@e2e.test`, { exact: true })).toBeVisible();

  // CCE-provisioned identity works through OTP; submit real app ticket and invoice.
  const customer = await session(request, 'customer', mobile);
  const uploaded = await request.post(`${API}/uploads`, { headers: { Authorization: `Bearer ${customer.accessToken}` }, multipart: { file: { name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%crm360\n') } } });
  const url = (await uploaded.json()).data.url;
  const ticket = await call(request, 'post', '/partner-warranty/claims', customer.accessToken, {
    brandId: w.brand.id, categoryId: w.category.id, issueId: w.issue.id, modelNumber: 'CRM-360', serialNumber: `360-${w.tag}`,
    purchaseDate: new Date(Date.now() - 864e5).toISOString(), remarks: 'Customer 360 complaint',
    address: { house: '12 Park Street', city: 'Surat', state: 'Gujarat', pincode: '395001' },
    documents: [{ kind: 'invoice', url, name: 'invoice.pdf' }],
  });
  await page.reload();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.screenshot({ path: `${shots}phase-3-overview.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Products', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText('CRM-360');
  await expect(page.getByRole('tabpanel')).toContainText('Verification Required');
  await page.screenshot({ path: `${shots}phase-3-products.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Tickets', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText(ticket.humanId);
  const linkedTicket = (await call(request, 'get', `/brand/customers/${id}`, w.staff.accessToken)).tickets.find(t => t.id === ticket.id);
  await expect(page.getByRole('tabpanel')).toContainText(linkedTicket.brandTicketNo);
  await page.getByRole('tab', { name: 'Service history', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText('No completed jobs for this brand.');
  await page.getByRole('tab', { name: 'Communication', exact: true }).click();
  const profile = await call(request, 'get', `/brand/customers/${id}`, w.staff.accessToken);
  expect(profile.communication.length).toBeGreaterThan(0);
  await expect(page.getByRole('tabpanel')).toContainText(profile.communication[0].title);
  await page.getByRole('link', { name: 'Back to customers' }).click();
  await page.getByRole('textbox', { name: 'Search customers' }).fill(mobile);
  await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  await page.screenshot({ path: `${shots}phase-3-customer-list.png`, fullPage: true });
  await page.getByRole('textbox', { name: 'Find by mobile' }).fill(`+91 ${mobile}`);
  await page.getByRole('button', { name: 'Find customer', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(id));
  await page.getByRole('link', { name: 'Back to customers' }).click();
  await page.getByRole('button', { name: 'New customer', exact: true }).click();
  await dialog.getByLabel('Name', { exact: true }).fill('Duplicate');
  await dialog.getByLabel('Mobile number', { exact: true }).fill(mobile);
  await dialog.getByRole('button', { name: 'Create customer', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Customer already exists');
  await dialog.getByRole('link', { name: 'Open existing profile', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(id));
  await page.getByRole('link', { name: 'New ticket for this customer' }).click();
  await expect(page).toHaveURL(new RegExp(`requests\\?customer=${id}`));
  await expect(page.getByRole('heading', {name:'Product',exact:true})).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
});

test('Viewer gets masked platform matches and cannot create, edit or export', async ({ page, request }) => {
  const w = await setup(request, 'viewer');
  const mobile = phone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone: mobile, password: 'password123' } });
  await signIn(page, w.staff);
  await page.goto('/brand-admin/customers');
  await expect(page.getByRole('button', { name: 'New customer', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Find by mobile' }).fill(mobile);
  await page.getByRole('button', { name: 'Find customer', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(`******${mobile.slice(-4)}`);
  await expect(page.getByRole('link', { name: 'Use existing customer for a ticket' })).toHaveCount(0);
});

test('owner exports CSV after an expired access token is refreshed', async ({ page, request }) => {
  const w = await setup(request, 'brand_super_admin');
  const mobile = phone();
  await call(request, 'post', '/brand/customers', w.staff.accessToken, { name: '=CSV Customer', phone: mobile });
  await signIn(page, w.staff);
  await page.goto('/brand-admin/customers');
  await expect(page.getByRole('link', { name: '=CSV Customer', exact: true })).toBeVisible();
  // Force just the first file request to receive a real 401. The helper must
  // refresh the valid session and retry with the new access token.
  await page.route('**/brand/customers?format=csv*', route => route.continue({ headers: { ...route.request().headers(), authorization: 'Bearer expired' } }), { times: 1 });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('brand-customers.csv');
  const file = await download.path();
  const csv = fs.readFileSync(file, 'utf8');
  expect(csv).toContain(mobile);
  expect(csv).toContain("'=CSV Customer");
});
