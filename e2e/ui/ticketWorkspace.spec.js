import { test, expect } from '@playwright/test';
const user = { id: '000000000000000000000001', role: 'brand_admin', name: 'Brand Agent', email: 'brand@test.local', permissions: ['tickets:view', 'tickets:create', 'tickets:export'] };
const tickets = ['A', 'B'].map((name, i) => ({ id: `00000000000000000000000${i + 2}`, humanId: `TICKET-${name}`, customer: { name: `Customer ${name}`, phone: '******1234' }, productName: 'AC', issueName: 'Not cooling', source: i ? 'brand_manual' : 'toll_free', status: 'Submitted', statusLabel: 'Pending Approval', priority: 'Normal', jobStage: '', warranty: { status: 'In Warranty' }, sla: {}, createdAt: '2026-10-21T09:00:00Z' }));
async function setup(page) {
  const queries = [], errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(user => { localStorage.setItem('ncc_access_token_brand_admin', 'test-token'); localStorage.setItem('ncc_user_brand_admin', JSON.stringify(user)); }, user);
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname.replace('/api/v1', ''); let data = {}, meta = {};
    if (path === '/auth/me') data = user;
    else if (path === '/brand/tickets/queue-options') data = { buckets: { pending_approval: 'Pending Approval', in_service: 'In Service', closed: 'Closed' }, statuses: ['Submitted', 'Closed'], sources: ['toll_free', 'brand_manual'], priorities: ['Normal', 'High'], jobStages: ['ASSIGNED'], warrantyStatuses: ['In Warranty'], staff: [], categories: [] };
    else if (path === '/brand/tickets/export') return route.fulfill({ contentType: 'text/csv', body: 'Ticket\nTICKET-A\n' });
    else if (path === '/brand/tickets') {
      queries.push(url.searchParams.toString()); data = tickets.filter(t => (!url.searchParams.get('source') || t.source === url.searchParams.get('source')) && (!url.searchParams.get('q') || t.customer.name.includes(url.searchParams.get('q')))); meta = { total: data.length, counts: { pending_approval: 2 } };
    } else if (path === '/notifications') data = [];
    await route.fulfill({ json: { data, meta, error: null } });
  });
  return { queries, errors };
}
test('compact ticket search preserves advanced filters, reset and CSV', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); const { queries, errors } = await setup(page);
  await page.goto('/brand-admin/tickets');
  await expect(page.getByLabel('City', { exact: true })).toHaveCount(0);
  await page.getByLabel('Source', { exact: true }).selectOption('toll_free');
  await expect(page.getByRole('link', { name: 'TICKET-B', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /More filters/ }).click();
  await page.getByLabel('City', { exact: true }).fill('Indore');
  await page.getByRole('tab', { name: 'Pending Approval (2)', exact: true }).click();
  await expect.poll(() => queries.at(-1)).toContain('city=Indore');
  expect(new URLSearchParams(queries.at(-1)).get('source')).toBe('toll_free');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Select', exact: true })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/brand-ticket-workspace.png', fullPage: true });
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV', exact: true }).click(); expect((await download).suggestedFilename()).toBe('brand-tickets.csv');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('link', { name: 'TICKET-B', exact: true })).toBeVisible();
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('');
  await page.getByLabel('Search claims').fill('Customer B');
  await expect(page.getByRole('link', { name: 'TICKET-A', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); expect(errors).toEqual([]);
});

for (const keyboard of [false, true]) {
  test(`ticket opens from ${keyboard ? 'keyboard on the row' : 'a non-link cell'}`, async ({ page }) => {
    await setup(page);
    // Stop at the destination: this test covers queue navigation, while the
    // API-backed queue suite verifies that the real ticket detail renders.
    await page.route(`**/api/v1/brand/tickets/${tickets[0].id}`, route => route.fulfill({ status: 404, json: { error: { message: 'Destination reached' } } }));
    await page.goto('/brand-admin/tickets');
    const row = page.getByRole('row', { name: 'Open ticket TICKET-A', exact: true });
    if (keyboard) { await row.focus(); await row.press('Enter'); }
    else await row.getByRole('cell').filter({ hasText: 'Not cooling' }).click();
    await expect(page).toHaveURL(new RegExp(`/brand-admin/tickets/${tickets[0].id}$`));
    await expect(page.getByRole('link', { name: 'Back to Tickets' })).toBeVisible();
  });
}
