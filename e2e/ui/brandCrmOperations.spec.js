import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const API = 'http://localhost:4111/api/v1';
test.use({ actionTimeout: 15000 });
async function call(r, method, path, token, data) {
  const res = await r[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw Error(`${path}: ${JSON.stringify(body.error)}`);
  return body.data;
}
async function session(r, role, identifier) {
  await r.post(`${API}/auth/otp/send`, { data: { role, identifier } });
  const code = (await (await r.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return call(r, 'post', '/auth/otp/verify', '', { role, identifier, code });
}
async function downloadText(page, click) {
  const download = page.waitForEvent('download'); await click();
  return readFile(await (await download).path(), 'utf8');
}
test('completion monitor updates live, exports files, submits Re-QC and renders printable documents', async ({ page, request: r }) => {
  test.setTimeout(180000);
  const tag = randomUUID().slice(0, 8);
  const email = `ops-admin-${tag}@e2e.test`;
  await r.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await session(r, 'super_admin', email);
  const category = (await call(r, 'get', '/super-admin/catalogue/categories', admin.accessToken)).find(c => c.key === 'AC');
  const brand = await call(r, 'post', '/super-admin/brands', admin.accessToken, { name: `Operations ${tag}`, status: 'Active' });
  await call(r, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin.accessToken, { warrantyEnabled: true, coverage: [category.id] });
  const staffEmail = `ops-owner-${tag}@e2e.test`;
  await r.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email: staffEmail, brand: brand.id, brandRoleTemplate: 'brand_super_admin', employeeId: 'OPS-020', password: 'password123' } });
  const owner = await session(r, 'brand_admin', staffEmail);
  const issue = await call(r, 'post', '/super-admin/warranty-catalog/issues', admin.accessToken, { category: category.id, name: `Operations fault ${tag}` });
  const city = `Ops ${tag}`;
  const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  const partnerPhone = phone();
  const provider = await r.post(`${API}/_dev/test-serviceProvider`, { data: { phone: partnerPhone, password: 'password123', specs: ['AC'], serviceCityName: city, availability: 'Available', name: `Operations Partner ${tag}` } });
  expect(provider.ok()).toBe(true);
  const partner = await session(r, 'service_provider', partnerPhone);
  const ticket = await call(r, 'post', '/brand/tickets', owner.accessToken, { newCustomer: { name: `Operations Caller ${tag}`, phone: phone() }, source: 'toll_free', categoryId: category.id, issueId: issue.id, remarks: 'AC needs service', address: { house: '12 Operations Road', city, state: 'Maharashtra', pincode: '411001' }, product: {} });
  await call(r, 'post', `/brand/tickets/${ticket.id}/approve`, owner.accessToken, { coverageDecision: 'goodwill', remarks: 'Brand covers this repair' });
  const detail = await call(r, 'get', `/brand/tickets/${ticket.id}`, owner.accessToken);
  const job = await call(r, 'post', `/service-provider/jobs/accept/${detail.job.id}`, partner.accessToken, {});
  await page.addInitScript(s => {
    localStorage.setItem('ncc_access_token_brand_admin', s.accessToken);
    localStorage.setItem('ncc_refresh_token_brand_admin', s.refreshToken);
    localStorage.setItem('ncc_user_brand_admin', JSON.stringify(s.user));
  }, owner);
  await page.goto('/brand-admin/service-completion');
  await expect(page.getByTestId('completion-total')).toHaveText('0');
  for (const step of ['start-travel', 'arrive']) await call(r, 'post', `/service-provider/jobs/${job.id}/${step}`, partner.accessToken, {});
  await call(r, 'post', `/service-provider/jobs/${job.id}/diagnosis`, partner.accessToken, { notes: 'Fault diagnosed' });
  await call(r, 'post', `/service-provider/jobs/${job.id}/spare-parts`, partner.accessToken, { parts: [] });
  await call(r, 'post', `/service-provider/jobs/${job.id}/repair-complete`, partner.accessToken, {});
  // No reload: verifies the completion monitor's socket subscription.
  await expect(page.getByTestId('completion-total')).toHaveText('1', { timeout: 15000 });
  await expect(page.getByRole('row').filter({ hasText: detail.job.nccJobId })).toContainText('Operations Caller');
  await page.getByRole('button', { name: 'Completed Today', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const csv = await downloadText(page, () => page.getByRole('button', { name: 'Export CSV', exact: true }).click());
  expect(csv).toContain('Operations Caller'); expect(csv).toContain(detail.job.nccJobId);
  await page.getByRole('button', { name: /^View NCCJ-/ }).click();
  await expect(page.getByLabel('Reason for Re-QC')).toBeVisible();
  await page.getByLabel('Reason for Re-QC').fill('Customer requests a second quality inspection');
  await page.getByRole('button', { name: 'Request Re-QC', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const escalations = await call(r, 'get', `/brand/escalations?warrantyClaim=${ticket.id}`, owner.accessToken);
  expect(escalations.some(e => e.reason === 'Re-QC: Customer requests a second quality inspection')).toBe(true);

  await page.goto('/brand-admin/documents');
  await page.getByLabel('Complaint / Ticket', { exact: true }).selectOption(detail.job.id);
  await page.getByRole('button', { name: 'Generate Document Preview', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Generated document"]');
  await expect(frame.getByText(`Operations Caller ${tag}`, { exact: true })).toBeVisible();
  const html = await downloadText(page, () => page.getByRole('button', { name: 'Download document (HTML)', exact: true }).click());
  expect(html).toContain(brand.name); expect(html).toContain(detail.job.nccJobId);
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).first().click();
  const popup = await popupPromise;
  await expect(popup.getByRole('button', { name: 'Print / Save PDF' })).toBeVisible();
  await popup.evaluate(() => { window.print = () => { window.printInvoked = true; }; });
  await popup.getByRole('button', { name: 'Print / Save PDF' }).click();
  expect(await popup.evaluate(() => window.printInvoked)).toBe(true);
  await popup.close();

  await call(r, 'post', '/brand/replacement-approvals', owner.accessToken, { serviceRequest: detail.job.id, product: 'AC', reason: 'Quality review replacement' });
  await page.goto('/brand-admin/replacement-approvals');
  const replacementCsv = await downloadText(page, () => page.getByRole('button', { name: 'Export CSV', exact: true }).click());
  expect(replacementCsv).toContain('Quality review replacement');
  expect(replacementCsv).toContain(detail.job.nccJobId);
});
