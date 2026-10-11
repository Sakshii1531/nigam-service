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
test('two closed jobs → NCC issues invoice → partial receipt appears in brand billing', async ({
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
  const city = `Billing ${tag}`;
  await call(r, 'post', '/super-admin/cities', admin.accessToken, {
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
  const ncc = await pageFor(browser, admin, 'super_admin');
  await ncc.goto('/super-admin/brand-billing');
  await ncc.getByLabel('Brand', {
    exact: true
  }).selectOption(brand.id);
  await expect(ncc.getByTestId('billing-unbilled')).toContainText('708.00');
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  await ncc.getByLabel('Period from', {
    exact: true
  }).fill(from);
  await ncc.getByLabel('Period before (exclusive)', {
    exact: true
  }).fill(to);
  await ncc.getByRole('button', {
    name: 'Draft invoice',
    exact: true
  }).click();
  const drawer = ncc.getByRole('dialog', {
    name: 'Invoice details'
  });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('tbody tr')).toHaveCount(2);
  const invoiceNo = await drawer.getByRole('heading').textContent();
  await drawer.getByRole('button', {
    name: 'Issue invoice',
    exact: true
  }).click();
  await expect(drawer).toContainText('issued');
  const brandPage = await pageFor(browser, owner, 'brand_admin');
  await brandPage.goto('/brand-admin/invoices');
  await brandPage.getByRole('tab', {
    name: 'Invoices',
    exact: true
  }).click();
  await expect(brandPage.getByRole('button', {
    name: invoiceNo,
    exact: true
  })).toBeVisible();
  await expect(brandPage.getByTestId('billing-invoice-value')).toContainText('708.00');
  await drawer.getByRole('button', {
    name: 'Record payment',
    exact: true
  }).click();
  const payment = ncc.getByRole('dialog', {
    name: 'Billing action'
  });
  await payment.getByLabel('Amount (₹)', {
    exact: true
  }).fill('100');
  await payment.getByLabel('Reference', {
    exact: true
  }).fill(`BANK-${tag}`);
  await payment.getByRole('button', {
    name: 'Save',
    exact: true
  }).click();
  await expect(payment).toBeHidden();
  await expect(drawer).toContainText('partially_paid');
  await brandPage.reload();
  await expect(brandPage.getByTestId('billing-pending')).toContainText('608.00');
  await expect(brandPage.getByTestId('billing-paid')).toContainText('100.00');
  await brandPage.getByRole('tab', {
    name: 'Payments',
    exact: true
  }).click();
  await expect(brandPage.getByRole('cell', {
    name: `BANK-${tag}`,
    exact: true
  })).toBeVisible();
  await brandPage.screenshot({
    path: fileURLToPath(new URL('../../docs/brand-crm/screenshots/phase-13-brand-billing.png', import.meta.url)),
    fullPage: true
  });
  await drawer.getByRole('button', {
    name: 'Close invoice',
    exact: true
  }).click();
  await expect(ncc.getByRole('button', {name:invoiceNo,exact:true})).toBeVisible();
  await ncc.screenshot({
    path: fileURLToPath(new URL('../../docs/brand-crm/screenshots/phase-13-ncc-billing.png', import.meta.url)),
    fullPage: true
  });
  await brandPage.goto('/brand-admin/payments');
  await expect(brandPage.getByRole('cell', {
    name: `BANK-${tag}`,
    exact: true
  })).toBeVisible();
  await expect(brandPage.getByRole('heading', {
    name: 'Dues ageing',
    exact: true
  })).toBeVisible();
  await brandPage.goto('/brand-admin/settings');
  await brandPage.getByRole('button',{name:'Billing profile',exact:true}).click();
  await brandPage.getByLabel('Legal name',{exact:true}).fill(`Billing Legal ${tag}`);
  await brandPage.getByLabel('Billing address',{exact:true}).fill('12 Billing Street');
  await brandPage.getByRole('button',{name:'Save billing profile',exact:true}).click();
  await expect(brandPage.getByRole('status').filter({hasText:'Billing profile saved'})).toBeVisible();
  for (const p of [ncc, brandPage]) await p.context().close();
});
