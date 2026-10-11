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
test('manager priority changes appear in the audit log with employee ID, diffs, export and scoped permissions', async ({
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
  const managerEmail = `manager-${tag}@e2e.test`;
  const created = await r.post(`${API}/_dev/test-user`,{data:{role:'brand_admin',email:managerEmail,password:'password123',brand:brand.id,brandRoleTemplate:'brand_manager',employeeId:`MGR-${tag}`,name:'Audit Manager'}});
  expect(created.ok()).toBe(true);
  const manager = await session(r,'brand_admin',managerEmail);
  const page = await pageFor(browser,manager,'brand_admin'),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/brand-admin/tickets/${ticket.id}`);
  await page.getByRole('button',{name:'Change priority',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('New priority').selectOption('High');
  await dialog.getByLabel('Priority change remarks').fill('Customer requested urgent repair');
  await dialog.getByRole('button',{name:'Save action',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Show audit entries')).toBeVisible();
  await page.getByLabel('Show audit entries').check();
  const ticketAuditRow=page.getByRole('row').filter({hasText:'ticket.priority_changed'});
  await ticketAuditRow.locator('summary').click();
  await expect(ticketAuditRow).toContainText('Normal → High');
  await page.goto('/brand-admin/audit-log');
  await page.getByLabel('Action',{exact:true}).fill('ticket.priority_changed');
  await page.getByRole('button',{name:'Apply filters',exact:true}).click();
  const row=page.getByRole('row').filter({hasText:'ticket.priority_changed'});
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(`MGR-${tag}`);
  await expect(row).toContainText('Brand Manager');
  await row.locator('summary').click();
  await expect(row).toContainText('Normal → High');
  await expect(row).toContainText('Customer requested urgent repair');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export CSV',exact:true}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('brand-audit-log.csv');
  await page.screenshot({path:fileURLToPath(new URL('../../docs/brand-crm/screenshots/phase-16-audit-log.png',import.meta.url)),fullPage:true});
  const cceEmail=`audit-cce-${tag}@e2e.test`;
  await r.post(`${API}/_dev/test-user`,{data:{role:'brand_admin',email:cceEmail,password:'password123',brand:brand.id,brandRoleTemplate:'cce'}});
  const ccePage=await pageFor(browser,await session(r,'brand_admin',cceEmail),'brand_admin');
  await ccePage.goto('/brand-admin/audit-log');
  await expect(ccePage.getByRole('heading',{name:'Access restricted'})).toBeVisible();
  const adminPage=await pageFor(browser,admin,'super_admin');
  await adminPage.goto('/super-admin/logs');
  await adminPage.getByLabel('Brand',{exact:true}).selectOption(brand.id);
  await adminPage.getByLabel('Action',{exact:true}).fill('ticket.priority_changed');
  await adminPage.getByRole('button',{name:'Apply filters',exact:true}).click();
  const adminRow=adminPage.getByRole('row').filter({hasText:'ticket.priority_changed'});
  await expect(adminRow).toHaveCount(1);
  await expect(adminRow).toContainText(brand.name);
  await expect(adminRow).toContainText(`MGR-${tag}`);
  await adminPage.context().close();
  expect(errors).toEqual([]);
  await ccePage.context().close();await page.context().close();
});
