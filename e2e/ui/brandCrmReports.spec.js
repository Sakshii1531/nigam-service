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
test('report expands Maharashtra → Pune, filters, switches all reports and downloads CSV/XLSX', async ({
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
  const city = 'Pune';
  const existingCities = await call(r, 'get', '/super-admin/cities', admin.accessToken);
  if (!(existingCities.items || existingCities).some(c => c.name === city && c.state === 'Maharashtra')) await call(r, 'post', '/super-admin/cities', admin.accessToken, {
    name: city,
    state: 'Maharashtra',
    status: 'Active'
  });
  await call(r, 'post', '/super-admin/brand-rates', admin.accessToken, {
    brand: brand.id,
    category: ac.id,
    serviceType: 'repair',
    brandRate: 300,
    partnerPayout: 200,
    effectiveFrom: '2026-01-01'
  });
  const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  const partnerPhone = phone();
  const createdPartner = await r.post(`${API}/_dev/test-serviceProvider`, {
    data: {
      phone: partnerPhone,
      password: 'password123',
      specs: ['AC'],
      serviceCityName: city,
      availability: 'Available'
    }
  });
  expect(createdPartner.ok()).toBe(true);
  const tech = await session(r, 'service_provider', partnerPhone);
  for (let i = 0; i < 2; i++) {
    const customerPhone = phone();
    const ticket = await call(r, 'post', '/brand/tickets', owner.accessToken, {
      newCustomer: {
        name: `Billing caller ${i}`,
        phone: customerPhone
      },
      source: 'toll_free',
      categoryId: ac.id,
      issueId: issue.id,
      remarks: 'Cooling repair',
      address: {
        house: '12 Billing Street',
        city,
        state: 'Maharashtra',
        pincode: '411001'
      },
      product: {}
    });
    const customer = await session(r, 'customer', customerPhone);
    await call(r, 'post', `/brand/tickets/${ticket.id}/approve`, owner.accessToken, {
      coverageDecision: 'goodwill',
      remarks: 'Covered repair'
    });
    const detail = await call(r, 'get', `/brand/tickets/${ticket.id}`, owner.accessToken);
    const job = await call(r, 'post', `/service-provider/jobs/accept/${detail.job.id}`, tech.accessToken, {});
    for (const step of ['start-travel', 'arrive']) await call(r, 'post', `/service-provider/jobs/${job.id}/${step}`, tech.accessToken, {});
    await call(r, 'post', `/service-provider/jobs/${job.id}/diagnosis`, tech.accessToken, {
      notes: 'Cooling problem'
    });
    await call(r, 'post', `/service-provider/jobs/${job.id}/spare-parts`, tech.accessToken, {
      parts: []
    });
    await call(r, 'post', `/service-provider/jobs/${job.id}/repair-complete`, tech.accessToken, {});
    await call(r, 'post', `/service-provider/jobs/${job.id}/billing`, tech.accessToken, {});
    const tracked = await call(r, 'get', `/partner-warranty/claims/${ticket.id}/track`, customer.accessToken);
    await call(r, 'post', `/service-provider/jobs/${job.id}/collect-payment`, tech.accessToken, {
      paymentMethod: 'Cash',
      otp: tracked.completionOtp
    });
    await call(r, 'post', `/partner-warranty/claims/${ticket.id}/confirm`, customer.accessToken, {});
    const closed = await call(r, 'get', `/brand/tickets/${ticket.id}`, owner.accessToken);
    expect(closed.billing.status).toBe('billable');
  }
  const page = await pageFor(browser, owner, 'brand_admin');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/brand-admin/reports');
  await expect(page.getByTestId('report-total')).toContainText('708.00');
  await page.getByRole('button', {
    name: '▸ Maharashtra',
    exact: true
  }).click();
  const row = page.getByRole('row').filter({
    has: page.getByRole('cell', {
      name: 'Pune',
      exact: true
    })
  });
  await expect(row).toContainText('300.00 × 2');
  await expect(row).toContainText('708.00');
  await page.getByLabel('State', {
    exact: true
  }).selectOption('Maharashtra');
  await page.getByLabel('City', {
    exact: true
  }).selectOption('Pune');
  await expect(page).toHaveURL(/state=Maharashtra.*city=Pune/);
  await expect(page.getByTestId('report-calls')).toHaveText('2');
  for (const [button, ext] of [['Export CSV', 'csv'], ['Export Excel', 'xlsx']]) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', {
      name: button,
      exact: true
    }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(new RegExp(`-state-city-billing-all-all\\.${ext}$`));
    expect(await file.failure()).toBeNull();
  }
  await page.screenshot({
    path: fileURLToPath(new URL('../../docs/brand-crm/screenshots/phase-14-state-city.png', import.meta.url)),
    fullPage: true
  });
  for (const report of ['source', 'product', 'sla', 'resolution-time', 'warranty', 'billing', 'partner-performance']) {
    await page.getByLabel('Report', {
      exact: true
    }).selectOption(report);
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  await page.reload();
  await expect(page.getByLabel('Report', {
    exact: true
  })).toHaveValue('partner-performance');
  await expect(page.getByLabel('City', {
    exact: true
  })).toHaveValue('Pune');
  await page.context().close();
});
