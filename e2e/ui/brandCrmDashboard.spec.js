import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
async function call(r, m, p, t, data) {
  const res = await r[m](`${API}${p}`, {
    headers: {
      Authorization: `Bearer ${t}`
    },
    ...(data ? {
      data
    } : {})
  });
  const b = await res.json();
  if (!res.ok()) throw Error(`${p}: ${JSON.stringify(b.error)}`);
  return b.data;
}
async function session(r, role, identifier) {
  const sent = await r.post(`${API}/auth/otp/send`, {
    headers: {
      'X-Device-Id': `rates-${identifier}`
    },
    data: {
      role,
      identifier
    }
  });
  expect(sent.ok()).toBe(true);
  const code = (await (await r.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return call(r, 'post', '/auth/otp/verify', '', {
    role,
    identifier,
    code
  });
}
async function pageFor(browser, s, portal) {
  const page = await (await browser.newContext({
    viewport: {
      width: 1440,
      height: 1000
    }
  })).newPage();
  await page.addInitScript(({
    s,
    portal
  }) => {
    for (const [k, v] of Object.entries({
      access_token: s.accessToken,
      refresh_token: s.refreshToken,
      user: JSON.stringify(s.user)
    })) localStorage.setItem(`ncc_${k}_${portal}`, v);
  }, {
    s,
    portal
  });
  return page;
}
test('dashboard approval updates live across browsers, trims CCE billing and drills into SLA tickets', async ({
  browser,
  request: r
}) => {
  test.setTimeout(180000);
  const tag = randomUUID().slice(0, 8);
  async function staff(role, brand) {
    const email = `billing-${role}-${tag}@e2e.test`;
    const created = await r.post(`${API}/_dev/test-user`, {
      data: {
        role,
        email,
        password: 'password123',
        ...(brand ? {
          brand,
          brandRoleTemplate: 'brand_super_admin',
          employeeId: `BILL-${tag}`
        } : {
          platformPermissions: ['billing:manage']
        })
      }
    });
    expect(created.ok()).toBe(true);
    return session(r, role, email);
  }
  const admin = await staff('super_admin');
  const ac = (await call(r, 'get', '/super-admin/catalogue/categories', admin.accessToken)).find(c => c.key === 'AC');
  const brand = await call(r, 'post', '/super-admin/brands', admin.accessToken, {
    name: `Billing ${tag}`,
    status: 'Active'
  });
  await call(r, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin.accessToken, {
    warrantyEnabled: true,
    coverage: [ac.id]
  });
  const owner = await staff('brand_admin', brand.id);
  const issue = await call(r, 'post', '/super-admin/warranty-catalog/issues', admin.accessToken, {
    category: ac.id,
    name: `Billing repair ${tag}`
  });
  const city = `Dashboard ${tag}`;
  const existingCities = await call(r, 'get', '/super-admin/cities', admin.accessToken);
  if (!(existingCities.items || existingCities).some(c => c.name === city && c.state === 'Maharashtra')) await call(r, 'post', '/super-admin/cities', admin.accessToken, {
    name: city,
    state: 'Maharashtra',
    status: 'Active'
  });
  const phone = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  const ticket = await call(r, 'post', '/brand/tickets', owner.accessToken, {
    newCustomer: {
      name: `Dashboard caller ${tag}`,
      phone
    },
    source: 'toll_free',
    categoryId: ac.id,
    issueId: issue.id,
    remarks: 'Cooling issue',
    address: {
      house: '12 Test Street',
      city,
      state: 'Maharashtra',
      pincode: '411001'
    },
    product: {}
  });
  const page = await pageFor(browser, owner, 'brand_admin');
  const approver = await pageFor(browser, owner, 'brand_admin');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/brand-admin/dashboard');
  await expect(page.getByTestId('dashboard-pendingApproval')).toHaveText('1');
  await expect(page.getByTestId('dashboard-approved')).toHaveText('0');
  await approver.goto(`/brand-admin/tickets/${ticket.id}`);
  await approver.getByRole('button', {
    name: 'Approve',
    exact: true
  }).click();
  const dialog = approver.getByRole('dialog');
  await dialog.getByLabel('Goodwill — brand pays').check();
  await dialog.getByLabel('Goodwill justification', {
    exact: true
  }).fill('Covered for dashboard live test');
  await dialog.getByRole('button', {
    name: 'Approve claim',
    exact: true
  }).click();
  await expect(page.getByTestId('dashboard-pendingApproval')).toHaveText('0', {
    timeout: 15000
  });
  await expect(page.getByTestId('dashboard-approved')).toHaveText('1');
  await page.getByRole('link', {
    name: 'SLA Breached',
    exact: true
  }).click();
  await expect(page).toHaveURL(/dashboardKpi=sla_breached/);
  await expect(page.getByText('Dashboard filter: sla breached')).toBeVisible();
  await page.goto('/brand-admin/dashboard');
  await page.getByLabel('Dashboard date range').selectOption('today');
  await expect(page).toHaveURL(/from=.*to=/);
  await expect(page.getByTestId('dashboard-total')).toHaveText('1');
  await page.getByRole('heading', {name:'Quick Actions',exact:true}).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({
    path: fileURLToPath(new URL('../../docs/brand-crm/screenshots/phase-15-dashboard.png', import.meta.url)),
    fullPage: true
  });
  const cceEmail = `dashboard-cce-${tag}@e2e.test`;
  const created = await r.post(`${API}/_dev/test-user`, {
    data: {
      role: 'brand_admin',
      email: cceEmail,
      password: 'password123',
      brand: brand.id,
      brandRoleTemplate: 'cce',
      employeeId: `CCE-${tag}`
    }
  });
  expect(created.ok()).toBe(true);
  const cce = await pageFor(browser, await session(r, 'brand_admin', cceEmail), 'brand_admin');
  await cce.goto('/brand-admin/dashboard');
  await expect(cce.getByTestId('dashboard-total')).toHaveText('1');
  await expect(cce.getByTestId('dashboard-totalBilling')).toHaveCount(0);
  await expect(cce.getByRole('heading', {
    name: 'Financial Overview',
    exact: true
  })).toHaveCount(0);
  expect(errors).toEqual([]);
  for (const p of [page, approver, cce]) await p.context().close();
});
