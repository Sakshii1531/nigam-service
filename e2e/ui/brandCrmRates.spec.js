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
    headers: {'X-Device-Id': `rates-${identifier}`},
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
test('Pune override → completed Pune job → frozen billing and NCC rates', async ({
  browser,
  request: r
}) => {
  test.setTimeout(180000);
  const tag = randomUUID().slice(0, 8);
  async function staff(role, template, brand) {
    const email = `rates-${template || role}-${tag}@e2e.test`;
    const created = await r.post(`${API}/_dev/test-user`, {
      data: {
        role,
        email,
        password: 'password123',
        ...(brand ? {
          brand,
          brandRoleTemplate: template,
          employeeId: `${template}-012`
        } : {})
      }
    });
    expect(created.ok()).toBe(true);
    return session(r, role, email);
  }
  const admin = await staff('super_admin'),
    ac = (await call(r, 'get', '/super-admin/catalogue/categories', admin.accessToken)).find(c => c.key === 'AC'),
    b = await call(r, 'post', '/super-admin/brands', admin.accessToken, {
      name: `Rates ${tag}`,
      status: 'Active'
    });
  await call(r, 'put', `/super-admin/warranty-catalog/brands/${b.id}`, admin.accessToken, {
    warrantyEnabled: true,
    coverage: [ac.id]
  });
  const cities = await call(r, 'get', '/super-admin/cities', admin.accessToken);
  if (!cities.some(c => c.name === 'Pune' && c.state === 'Maharashtra')) await call(r, 'post', '/super-admin/cities', admin.accessToken, {
    name: 'Pune',
    state: 'Maharashtra',
    status: 'Active'
  });
  const issue = await call(r, 'post', '/super-admin/warranty-catalog/issues', admin.accessToken, {
      category: ac.id,
      name: `Not cooling ${tag}`
    }),
    owner = await staff('brand_admin', 'brand_super_admin', b.id),
    finance = await staff('brand_admin', 'brand_manager', b.id);
  const brand = await pageFor(browser, owner, 'brand_admin');
  await brand.goto('/brand-admin/call-rates');
  await brand.getByRole('button', {
    name: 'Add override',
    exact: true
  }).click();
  const form = brand.locator('form');
  await form.getByLabel('Category', {
    exact: true
  }).selectOption(ac.id);
  await form.getByLabel('State', {
    exact: true
  }).selectOption('Maharashtra');
  await form.getByLabel('City', {
    exact: true
  }).selectOption('Pune');
  await form.getByLabel('Brand rate', {
    exact: true
  }).fill('450');
  await form.getByRole('button', {
    name: 'Save rate',
    exact: true
  }).click();
  await expect(brand.getByRole('status').filter({
    hasText: 'Rate saved'
  })).toBeVisible({
    timeout: 20000
  });
  await expect(brand.getByText('Partner payout', {
    exact: true
  })).toHaveCount(0);
  await brand.getByLabel('Test category', {
    exact: true
  }).selectOption(ac.id);
  const tester = brand.locator('section').filter({
    has: brand.getByRole('heading', {
      name: 'What rate applies?',
      exact: true
    })
  });
  await tester.getByLabel('State', {
    exact: true
  }).selectOption('Maharashtra');
  await tester.getByLabel('City', {
    exact: true
  }).selectOption('Pune');
  await tester.getByRole('button', {
    name: 'Resolve rate',
    exact: true
  }).click();
  await expect(tester.getByRole('status')).toContainText('matched on city: Pune');
  const download = brand.waitForEvent('download');
  await brand.getByRole('button', {
    name: 'Export CSV',
    exact: true
  }).click();
  expect((await download).suggestedFilename()).toBe('brand-rates.csv');
  const phone = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  await r.post(`${API}/_dev/test-serviceProvider`, {
    data: {
      phone,
      password: 'password123',
      specs: ['AC'],
      serviceCityName: 'Pune',
      availability: 'Available'
    }
  });
  const tech = await session(r, 'service_provider', phone),
    ticket = await call(r, 'post', '/brand/tickets', owner.accessToken, {
      newCustomer: {
        name: `Rates caller ${tag}`,
        phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`
      },
      source: 'toll_free',
      categoryId: ac.id,
      issueId: issue.id,
      remarks: 'Repair required',
      address: {
        house: '12 Rate Street',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001'
      },
      product: {}
    });
  await call(r, 'post', `/brand/tickets/${ticket.id}/approve`, owner.accessToken, {
    coverageDecision: 'goodwill',
    remarks: 'Covered repair'
  });
  const detail = await call(r, 'get', `/brand/tickets/${ticket.id}`, owner.accessToken),
    job = await call(r, 'post', `/service-provider/jobs/accept/${detail.job.id}`, tech.accessToken, {});
  for (const step of ['start-travel', 'arrive']) await call(r, 'post', `/service-provider/jobs/${job.id}/${step}`, tech.accessToken, {});
  await call(r, 'post', `/service-provider/jobs/${job.id}/diagnosis`, tech.accessToken, {
    notes: 'Gas issue'
  });
  await call(r, 'post', `/service-provider/jobs/${job.id}/spare-parts`, tech.accessToken, {
    parts: []
  });
  await call(r, 'post', `/service-provider/jobs/${job.id}/repair-complete`, tech.accessToken, {});
  await brand.goto(`/brand-admin/tickets/${ticket.id}`);
  const billing = brand.getByTestId('ticket-billing');
  await expect(billing).toContainText('₹450.00');
  await expect(billing).toContainText('Matched on city: Pune');
  await expect(billing).toContainText('₹531.00');
  await expect(billing).toContainText('pending_closure');
  await brand.screenshot({
    path: fileURLToPath(new URL('../../docs/brand-crm/screenshots/phase-12-billing.png', import.meta.url)),
    fullPage: true
  });
  const rate = (await call(r, 'get', '/brand/rates', owner.accessToken))[0];
  await call(r, 'patch', `/brand/rates/${rate.id}`, owner.accessToken, {
    brandRate: 600
  });
  await brand.reload();
  await expect(billing).toContainText('₹450.00');
  const readOnly = await pageFor(browser, finance, 'brand_admin');
  await readOnly.goto('/brand-admin/call-rates');
  await expect(readOnly.getByRole('heading', {
    name: 'Service rates',
    exact: true
  })).toBeVisible();
  await expect(readOnly.getByRole('button', {
    name: 'Add override',
    exact: true
  })).toHaveCount(0);
  const ncc = await pageFor(browser, admin, 'super_admin');
  await ncc.goto('/super-admin/brand-rates');
  await ncc.getByLabel('Brand', {
    exact: true
  }).selectOption(b.id);
  await ncc.locator('summary').first().click();
  await expect(ncc.getByRole('columnheader', {
    name: 'Partner payout',
    exact: true
  }).first()).toBeVisible();
  await ncc.screenshot({
    path: fileURLToPath(new URL('../../docs/brand-crm/screenshots/phase-12-ncc-rates.png', import.meta.url)),
    fullPage: true
  });
  for (const p of [brand, readOnly, ncc]) await p.context().close();
});
