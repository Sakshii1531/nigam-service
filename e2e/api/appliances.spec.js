import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers the customer appliance registry and the server-priced extended
// warranty purchase. Both exist because the ExtendWarranty screen used to
// invent a purchase date, an expiry and a policy price client-side.

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

async function getOtpCode(request, identifier) {
  const res = await request.get(`/api/v1/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return (await res.json()).data.code;
}

async function loginAndVerify(request, { role, identifier, password }) {
  await request.post('/api/v1/auth/login', { data: { role, identifier, password } });
  const code = await getOtpCode(request, identifier);
  const res = await request.post('/api/v1/auth/otp/verify', { data: { role, identifier, code } });
  return (await res.json()).data.accessToken;
}

async function createCustomer(request) {
  const phone = uniquePhone();
  await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone, password: 'password123' } });
  const token = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });
  return { phone, token };
}

async function createSuperAdmin(request) {
  const email = `appliance-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  return loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });
}

function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

test.describe('customer appliance registry', () => {
  test('registers a unit, computes its cover from the recorded purchase date, and looks it up again', async ({ request }) => {
    const customer = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${customer.token}` } };
    const serial = `SN-${randomUUID()}`;

    const created = await request.post('/api/v1/appliances', {
      ...auth,
      data: { category: 'AC', brand: 'Voltas', modelNumber: 'MSQ18', serialNumber: serial, purchaseDate: monthsAgo(6) },
    });
    expect(created.status()).toBe(201);
    const appliance = (await created.json()).data;
    expect(appliance.warrantyStatus).toBe('In Warranty');
    expect(new Date(appliance.warrantyExpiresOn).getTime()).toBeGreaterThan(Date.now());

    const lookup = await request.get(`/api/v1/appliances/lookup?modelNumber=MSQ18&serialNumber=${encodeURIComponent(serial)}`, auth);
    expect(lookup.status()).toBe(200);
    expect((await lookup.json()).data.found).toBe(true);

    const list = await request.get('/api/v1/appliances', auth);
    expect((await list.json()).data.some((a) => a.serialNumber === serial)).toBe(true);
  });

  test("does not leak another customer's appliance", async ({ request }) => {
    const owner = await createCustomer(request);
    const other = await createCustomer(request);
    const serial = `SN-${randomUUID()}`;

    const created = await request.post('/api/v1/appliances', {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: { category: 'AC', serialNumber: serial, purchaseDate: monthsAgo(2) },
    });
    const { id } = (await created.json()).data;

    const asOther = await request.get(`/api/v1/appliances/${id}`, {
      headers: { Authorization: `Bearer ${other.token}` },
    });
    expect(asOther.status()).toBe(403);
  });
});

test.describe('extended warranty purchase', () => {
  test('charges the catalogue price over real HTTP, ignoring what the client claims', async ({ request }) => {
    const adminToken = await createSuperAdmin(request);
    const planRes = await request.post('/api/v1/super-admin/extended-warranty-plans', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: `E2E Pack ${randomUUID()}`, durationYears: 2, price: 1399, claimsTotal: 3 },
    });
    expect(planRes.status()).toBe(201);
    const plan = (await planRes.json()).data;

    const customer = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${customer.token}` } };

    const listed = await request.get('/api/v1/warranty-amc/extended-warranty/plans', auth);
    expect((await listed.json()).data.some((p) => p.id === plan.id)).toBe(true);

    const order = await request.post('/api/v1/warranty-amc/extended-warranty/orders', {
      ...auth,
      data: { plan: plan.id, category: 'AC', brand: 'LG', amountPaid: 1, planDurationYears: 99 },
    });
    expect(order.status()).toBe(201);
    const created = (await order.json()).data.order;
    expect(created.price).toBe(1399);
    expect(new Date(created.validTill).getFullYear() - new Date().getFullYear()).toBe(2);
  });

  test('404s on an unknown plan instead of falling back to a default price', async ({ request }) => {
    const customer = await createCustomer(request);
    const res = await request.post('/api/v1/warranty-amc/extended-warranty/orders', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { plan: '0'.repeat(24), category: 'AC' },
    });
    expect(res.status()).toBe(404);
  });
});

test.describe('authenticated file upload', () => {
  test('stores a customer invoice and rejects an anonymous upload', async ({ request }) => {
    const customer = await createCustomer(request);

    const res = await request.post('/api/v1/uploads', {
      headers: { Authorization: `Bearer ${customer.token}` },
      multipart: {
        file: { name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 invoice') },
      },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.url).toBeTruthy();

    const anon = await request.post('/api/v1/uploads', {
      multipart: { file: { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') } },
    });
    expect(anon.status()).toBe(401);
  });
});

test.describe('public brand list', () => {
  test('exposes active brands without authentication and hides pending ones', async ({ request }) => {
    const adminToken = await createSuperAdmin(request);
    const activeName = `E2E-Brand-${randomUUID()}`;
    const pendingName = `E2E-Pending-${randomUUID()}`;

    await request.post('/api/v1/super-admin/brands', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: activeName, category: 'Appliances', status: 'Active' },
    });
    await request.post('/api/v1/super-admin/brands', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: pendingName, category: 'Appliances', status: 'Pending' },
    });

    const res = await request.get('/api/v1/catalog/brands');
    expect(res.status()).toBe(200);
    const names = (await res.json()).data.map((b) => b.name);
    expect(names).toContain(activeName);
    expect(names).not.toContain(pendingName);
  });
});

test.describe('customer payments actually reach the gateway', () => {
  test('an advance booking creates a gateway order and stays unpaid until verified', async ({ request }) => {
    const adminToken = await createSuperAdmin(request);
    const categoryKey = `E2E-Pay-${randomUUID()}`;

    await request.post('/api/v1/catalog/categories', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { key: categoryKey, name: categoryKey },
    });
    await request.post(`/api/v1/catalog/categories/${categoryKey}/services`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { slug: 'repair', name: 'Repair', price: 1000 },
    });

    const customer = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${customer.token}` } };

    const res = await request.post('/api/v1/bookings', {
      ...auth,
      data: { category: categoryKey, serviceSlug: 'repair', paymentMode: 'advance', paymentMethod: 'UPI' },
    });
    expect(res.status()).toBe(201);
    const { booking, razorpay } = (await res.json()).data;

    expect(booking.advanceAmount).toBeGreaterThan(0);
    expect(booking.advancePaid).toBe(false);
    expect(razorpay.orderId).toBeTruthy();

    // A forged signature is rejected — the advance stays uncollected.
    const forged = await request.post(`/api/v1/bookings/${booking.id}/verify-payment`, {
      ...auth,
      data: { razorpayPaymentId: 'pay_x', razorpaySignature: 'forged' },
    });
    expect(forged.status()).toBe(400);

    const reread = await request.get(`/api/v1/bookings/${booking.id}`, auth);
    expect((await reread.json()).data.advancePaid).toBe(false);
  });

  test('a membership is only active after payment verification', async ({ request }) => {
    const adminToken = await createSuperAdmin(request);
    const planRes = await request.post('/api/v1/memberships/plans', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: `E2E Tier ${randomUUID()}`, price: 999, tierRank: Math.floor(Math.random() * 100000) + 100 },
    });
    expect(planRes.status()).toBe(201);
    const plan = (await planRes.json()).data;

    const customer = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${customer.token}` } };

    const purchase = await request.post('/api/v1/memberships/purchase', { ...auth, data: { planId: plan.id } });
    expect(purchase.status()).toBe(201);
    expect((await purchase.json()).data.membership.status).toBe('Pending Payment');

    // Unpaid means not a member.
    const me = await request.get('/api/v1/memberships/me', auth);
    expect((await me.json()).data).toBeNull();
  });
});
