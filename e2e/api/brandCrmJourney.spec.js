import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

async function call(request, method, path, token, data, headers = {}) {
  const response = await request[method](`/api/v1${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(data ? { data } : {})
  });
  const body = await response.json();
  expect(response.ok(), `${method.toUpperCase()} ${path}: ${JSON.stringify(body.error)}`).toBe(true);
  return body.data;
}

async function session(request, role, identifier) {
  await request.post('/api/v1/auth/otp/send', { data: { role, identifier } });
  const code = (await (await request.get(`/api/v1/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return call(request, 'post', '/auth/otp/verify', '', { role, identifier, code });
}

test('WhatsApp → approval → partner completion → invoice and payment over HTTP', async ({ request }) => {
  test.setTimeout(180000);
  const tag = randomUUID().slice(0, 8);
  const city = `Pune ${tag}`;
  const adminEmail = `journey-admin-${tag}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', {
    data: { role: 'super_admin', email: adminEmail, password: 'password123', platformPermissions: ['billing:manage'] }
  });
  const admin = await session(request, 'super_admin', adminEmail);
  const category = (await call(request, 'get', '/super-admin/catalogue/categories', admin.accessToken)).find(row => row.key === 'AC');
  const brand = await call(request, 'post', '/super-admin/brands', admin.accessToken, { name: `Journey ${tag}`, status: 'Active' });
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin.accessToken, { warrantyEnabled: true, coverage: [category.id] });
  const issue = await call(request, 'post', '/super-admin/warranty-catalog/issues', admin.accessToken, { category: category.id, name: `Not cooling ${tag}` });
  await call(request, 'post', '/super-admin/cities', admin.accessToken, { name: city, state: 'Maharashtra', status: 'Active' });
  await call(request, 'post', '/super-admin/brand-rates', admin.accessToken, {
    brand: brand.id,
    category: category.id,
    serviceType: 'repair',
    state: 'Maharashtra',
    city,
    brandRate: 300,
    partnerPayout: 200,
    effectiveFrom: '2026-01-01'
  });

  const ownerEmail = `journey-owner-${tag}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', {
    data: { role: 'brand_admin', email: ownerEmail, password: 'password123', brand: brand.id, brandRoleTemplate: 'brand_super_admin', employeeId: `OWNER-${tag}` }
  });
  const owner = await session(request, 'brand_admin', ownerEmail);
  const key = await call(request, 'post', '/brand/api-keys', owner.accessToken, {
    name: `WhatsApp ${tag}`,
    scopes: ['catalog:read', 'uploads:create', 'tickets:create', 'tickets:read'],
    allowedSources: ['whatsapp']
  });
  const intakeHeaders = { Authorization: `Bearer ${key.secret}`, 'Idempotency-Key': `wa-${tag}` };
  const customerPhone = phone();
  const ticketInput = {
    brandId: brand.id,
    categoryId: category.id,
    issueId: issue.id,
    source: 'whatsapp',
    customer: { name: `WhatsApp Customer ${tag}`, phone: customerPhone },
    remarks: 'Air conditioner is not cooling',
    address: { house: '19 Acceptance Lane', city, state: 'Maharashtra', pincode: '411001' },
    documents: [{ kind: 'product_photo', url: 'https://example.com/phase-19-photo.jpg' }]
  };
  const ticket = await call(request, 'post', '/intake/tickets', '', ticketInput, intakeHeaders);
  expect(await call(request, 'post', '/intake/tickets', '', ticketInput, intakeHeaders)).toEqual(ticket);
  expect(ticket).toMatchObject({ status: 'Submitted' });

  const queue = await call(request, 'get', '/brand/tickets?source=whatsapp', owner.accessToken);
  const row = queue.find(item => item.humanId === ticket.ticketNo);
  expect(row).toBeTruthy();
  const partnerPhone = phone();
  await request.post('/api/v1/_dev/test-serviceProvider', {
    data: { phone: partnerPhone, password: 'password123', specs: ['AC'], serviceCityName: city, availability: 'Available' }
  });
  const partner = await session(request, 'service_provider', partnerPhone);
  await call(request, 'post', `/brand/tickets/${row.id}/approve`, owner.accessToken, {
    coverageDecision: 'goodwill',
    remarks: 'Acceptance journey goodwill approval from the WhatsApp queue'
  });
  const detail = await call(request, 'get', `/brand/tickets/${row.id}`, owner.accessToken);
  const job = await call(request, 'post', `/service-provider/jobs/accept/${detail.job.id}`, partner.accessToken, {});
  for (const step of ['start-travel', 'arrive']) await call(request, 'post', `/service-provider/jobs/${job.id}/${step}`, partner.accessToken, {});
  await call(request, 'post', `/service-provider/jobs/${job.id}/diagnosis`, partner.accessToken, { notes: 'Loose electrical connection' });
  await call(request, 'post', `/service-provider/jobs/${job.id}/spare-parts`, partner.accessToken, { parts: [] });
  await call(request, 'post', `/service-provider/jobs/${job.id}/repair-complete`, partner.accessToken, {});
  await call(request, 'post', `/service-provider/jobs/${job.id}/billing`, partner.accessToken, {});
  const customer = await session(request, 'customer', customerPhone);
  const tracking = await call(request, 'get', `/partner-warranty/claims/${row.id}/track`, customer.accessToken);
  await call(request, 'post', `/service-provider/jobs/${job.id}/collect-payment`, partner.accessToken, { paymentMethod: 'Cash', otp: tracking.completionOtp });
  await call(request, 'post', `/partner-warranty/claims/${row.id}/confirm`, customer.accessToken, {});

  const closed = await call(request, 'get', `/brand/tickets/${row.id}`, owner.accessToken);
  expect(closed.ticket.status).toBe('Closed');
  expect(closed.billing).toMatchObject({ status: 'billable', subtotal: 300, gstAmount: 54, total: 354 });
  const closedAt = new Date(closed.billing.closedAt);
  const invoice = await call(request, 'post', '/super-admin/brand-billing/invoices', admin.accessToken, {
    brand: brand.id,
    periodFrom: new Date(closedAt.getTime() - 86400000).toISOString(),
    periodTo: new Date(closedAt.getTime() + 86400000).toISOString()
  });
  expect(invoice).toMatchObject({ total: 354, status: 'draft' });
  await call(request, 'post', `/super-admin/brand-billing/invoices/${invoice.id}/issue`, admin.accessToken, {});
  const receipt = await call(request, 'post', `/super-admin/brand-billing/invoices/${invoice.id}/payments`, admin.accessToken, {
    amount: 100,
    mode: 'bank_transfer',
    reference: `PHASE19-${tag}`
  });
  expect(receipt.invoice).toMatchObject({ status: 'partially_paid', paidAmount: 100, balance: 254 });
  const brandInvoices = await call(request, 'get', '/brand/billing/invoices', owner.accessToken);
  expect(brandInvoices.find(item => item.id === invoice.id)).toMatchObject({ total: 354, paidAmount: 100, balance: 254 });
});
