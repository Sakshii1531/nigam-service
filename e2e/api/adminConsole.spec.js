import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// The console-facing endpoints added while wiring the admin panels away from
// mock data: the platform technician directory, ad-hoc notification dispatch,
// the CMS readers that show unpublished content, warranty-registration
// verification, and the brand-wide review list.

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

async function createSuperAdmin(request) {
  const email = `console-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  const token = await loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });
  return { email, token };
}

async function createCustomer(request) {
  const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;
  const res = await request.post('/api/v1/_dev/test-user', {
    data: { role: 'customer', phone, password: 'password123' },
  });
  return { ...(await res.json()).data, phone };
}

async function createTechnician(request) {
  const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;
  const res = await request.post('/api/v1/_dev/test-technician', {
    data: { phone, password: 'password123', specs: ['AC'] },
  });
  return { ...(await res.json()).data, phone };
}

test.describe('platform technician directory', () => {
  test('lists every technician, filters by status, and escapes regex in search', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    await createTechnician(request);

    const listRes = await request.get('/api/v1/super-admin/technicians', auth);
    expect(listRes.status()).toBe(200);
    const items = (await listRes.json()).data;
    expect(items.length).toBeGreaterThan(0);
    // Notifications address the underlying User, so it must survive serialisation.
    expect(items[0].user).toBeDefined();

    const activeRes = await request.get('/api/v1/super-admin/technicians?status=Active', auth);
    expect(activeRes.status()).toBe(200);
    for (const t of (await activeRes.json()).data) expect(t.status).toBe('Active');

    // Would blow up as "Invalid regular expression" if the term were not escaped.
    const literalRes = await request.get('/api/v1/super-admin/technicians?search=a%2B%2B', auth);
    expect(literalRes.status()).toBe(200);

    const badRes = await request.get('/api/v1/super-admin/technicians?status=Bogus', auth);
    expect(badRes.status()).toBe(400);
  });

  test('forces a non-Active technician offline when status changes', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const tech = await createTechnician(request);

    const res = await request.patch(`/api/v1/super-admin/technicians/${tech.technicianId || tech.id}/status`, {
      ...auth,
      data: { status: 'Inactive' },
    });
    expect(res.status()).toBe(200);
    const updated = (await res.json()).data;
    expect(updated.status).toBe('Inactive');
    // An inactive technician must stop advertising availability to the job feed.
    expect(updated.availability).toBe('Offline');
  });

  test('is closed to unauthenticated callers', async ({ request }) => {
    const res = await request.get('/api/v1/super-admin/technicians');
    expect(res.status()).toBe(401);
  });
});

test.describe('ad-hoc notification dispatch', () => {
  test('writes an in-app notification addressed to a single recipient', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const customer = await createCustomer(request);

    const res = await request.post('/api/v1/notifications/push', {
      ...auth,
      data: { recipientId: customer.id, title: 'Account Approved!', body: 'You are live.' },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).data.title).toBe('Account Approved!');
  });

  test('supports a role-wide broadcast with no single recipient', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const res = await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${token}` },
      data: { broadcastRole: 'Technicians', title: 'Maintenance', body: 'App update tonight.' },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).data.recipient).toBeNull();
  });

  test('rejects a payload with neither or both addressing modes', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const customer = await createCustomer(request);

    const neither = await request.post('/api/v1/notifications/push', {
      ...auth,
      data: { title: 'Nowhere', body: 'To nobody.' },
    });
    expect(neither.status()).toBe(400);

    const both = await request.post('/api/v1/notifications/push', {
      ...auth,
      data: { recipientId: customer.id, broadcastRole: 'All', title: 'T', body: 'B' },
    });
    expect(both.status()).toBe(400);
  });

  test('sends an SMS to an explicit number and resolves one from a recipient', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const customer = await createCustomer(request);

    const explicit = await request.post('/api/v1/notifications/sms', {
      ...auth,
      data: { provider: 'smsindiahub', phone: '9876543210', message: 'Approved.' },
    });
    expect(explicit.status()).toBe(200);
    expect((await explicit.json()).data.to).toBe('9876543210');

    const resolved = await request.post('/api/v1/notifications/sms', {
      ...auth,
      data: { recipientId: customer.id, message: 'Approved.' },
    });
    expect((await resolved.json()).data.to).toBe(customer.phone);

    const nowhere = await request.post('/api/v1/notifications/sms', { ...auth, data: { message: 'Nowhere.' } });
    expect(nowhere.status()).toBe(400);
  });

  test('is closed to non-super-admins', async ({ request }) => {
    const customer = await createCustomer(request);
    const token = await loginAndVerify(request, {
      role: 'customer', identifier: customer.phone, password: 'password123',
    });
    const res = await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${token}` },
      data: { broadcastRole: 'All', title: 'T', body: 'B' },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('CMS console readers', () => {
  test('a Scheduled story is hidden from the app but visible to the console', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const title = `Scheduled ${randomUUID()}`;

    // The create schema takes no `status` (Zod strips unknown keys), so a story
    // is always born Active and is moved to Scheduled with a follow-up update.
    const createRes = await request.post('/api/v1/cms/stories', {
      ...auth,
      data: { title, type: 'Promo Banner' },
    });
    expect(createRes.status()).toBe(201);
    const story = (await createRes.json()).data;

    const scheduleRes = await request.put(`/api/v1/cms/stories/${story.id}`, {
      ...auth,
      data: { status: 'Scheduled' },
    });
    expect((await scheduleRes.json()).data.status).toBe('Scheduled');

    const publicRes = await request.get('/api/v1/cms/stories');
    expect((await publicRes.json()).data.map((s) => s.title)).not.toContain(title);

    const adminRes = await request.get('/api/v1/cms/stories/admin', auth);
    expect(adminRes.status()).toBe(200);
    expect((await adminRes.json()).data.map((s) => s.title)).toContain(title);
  });

  test('a Paused campaign is hidden from the app but visible to the console', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const name = `Paused ${randomUUID()}`;

    // Same as stories: `status` is not part of the create schema, so pause it
    // with a follow-up update.
    const createRes = await request.post('/api/v1/cms/advertisements', {
      ...auth,
      data: { name, type: 'Category Popup' },
    });
    const ad = (await createRes.json()).data;
    await request.put(`/api/v1/cms/advertisements/${ad.id}`, { ...auth, data: { status: 'Paused' } });

    const publicRes = await request.get('/api/v1/cms/advertisements');
    expect((await publicRes.json()).data.map((a) => a.name)).not.toContain(name);

    const adminRes = await request.get('/api/v1/cms/advertisements/admin?status=Paused', auth);
    expect((await adminRes.json()).data.map((a) => a.name)).toContain(name);
  });

  test('every console reader is closed without auth', async ({ request }) => {
    for (const path of ['stories', 'videos', 'advertisements', 'banners']) {
      const res = await request.get(`/api/v1/cms/${path}/admin`);
      expect(res.status()).toBe(401);
    }
  });
});

test.describe('warranty registration verification', () => {
  test('approves a registration without touching its coverage status', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const customer = await createCustomer(request);
    const customerToken = await loginAndVerify(request, {
      role: 'customer', identifier: customer.phone, password: 'password123',
    });

    // Created through the customer-facing purchase flow, as it would be in life.
    const orderRes = await request.post('/api/v1/warranty-amc/extended-warranty/orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
      data: { category: 'AC', brand: 'LG', modelName: 'LSA5NP2A', planDurationYears: 1, amountPaid: 799 },
    });
    expect([200, 201]).toContain(orderRes.status());

    const listRes = await request.get('/api/v1/super-admin/warranty-registrations?verificationStatus=Pending', auth);
    expect(listRes.status()).toBe(200);
    const pending = (await listRes.json()).data;
    expect(pending.length).toBeGreaterThan(0);

    const target = pending[0];
    const verifyRes = await request.patch(`/api/v1/super-admin/warranty-registrations/${target.id}/verification`, {
      ...auth,
      data: { verificationStatus: 'Approved' },
    });
    expect(verifyRes.status()).toBe(200);
    const verified = (await verifyRes.json()).data;
    expect(verified.verificationStatus).toBe('Approved');
    // Coverage lifecycle is a separate axis and must be untouched.
    expect(verified.status).toBe('Active');
  });

  test('rejects Pending as a decision and is closed without auth', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const listRes = await request.get('/api/v1/super-admin/warranty-registrations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const rows = (await listRes.json()).data;
    if (rows.length > 0) {
      const res = await request.patch(`/api/v1/super-admin/warranty-registrations/${rows[0].id}/verification`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { verificationStatus: 'Pending' },
      });
      expect(res.status()).toBe(400);
    }

    const anon = await request.get('/api/v1/super-admin/warranty-registrations');
    expect(anon.status()).toBe(401);
  });
});

test.describe('brand review list', () => {
  test('resolves to the brand aggregate, not an id lookup, and requires brand scope', async ({ request }) => {
    // Declared before GET /reviews/:id — an unauthenticated call must fail the
    // brand-scope guard (401), not fall through to an id lookup (404).
    const res = await request.get('/api/v1/reviews/brand');
    expect(res.status()).toBe(401);
  });

  test('lists only the calling brand\'s reviews', async ({ request }) => {
    const { token: adminToken } = await createSuperAdmin(request);
    const brandRes = await request.post('/api/v1/super-admin/brands', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: `Review Brand ${randomUUID()}` },
    });
    const brand = (await brandRes.json()).data;

    const email = `brand-admin-${randomUUID()}@e2e.test`;
    await request.post('/api/v1/_dev/test-user', {
      data: { role: 'brand_admin', email, password: 'password123', brand: brand.id },
    });
    const brandToken = await loginAndVerify(request, {
      role: 'brand_admin', identifier: email, password: 'password123',
    });

    const res = await request.get('/api/v1/reviews/brand', {
      headers: { Authorization: `Bearer ${brandToken}` },
    });
    expect(res.status()).toBe(200);
    // A brand new brand has no service requests, so no reviews can belong to it.
    expect((await res.json()).data).toEqual([]);
  });
});

test.describe('brand exchange list', () => {
  test('returns only trade-ins recorded against the calling brand', async ({ request }) => {
    const { token: adminToken } = await createSuperAdmin(request);
    const adminAuth = { headers: { Authorization: `Bearer ${adminToken}` } };

    const brandName = `Exchange Brand ${randomUUID()}`;
    const brandRes = await request.post('/api/v1/super-admin/brands', {
      ...adminAuth,
      data: { name: brandName },
    });
    const brand = (await brandRes.json()).data;

    const email = `exchange-admin-${randomUUID()}@e2e.test`;
    await request.post('/api/v1/_dev/test-user', {
      data: { role: 'brand_admin', email, password: 'password123', brand: brand.id },
    });
    const brandToken = await loginAndVerify(request, {
      role: 'brand_admin', identifier: email, password: 'password123',
    });

    // A customer trades in an appliance of this brand, and one of another brand.
    const customer = await createCustomer(request);
    const customerToken = await loginAndVerify(request, {
      role: 'customer', identifier: customer.phone, password: 'password123',
    });
    const customerAuth = { headers: { Authorization: `Bearer ${customerToken}` } };

    await request.post('/api/v1/exchange/requests', {
      ...customerAuth,
      data: { category: 'AC', brand: brandName, model: 'X-100', condition: 'Good', estimatedValue: 4500 },
    });
    await request.post('/api/v1/exchange/requests', {
      ...customerAuth,
      data: { category: 'AC', brand: 'Some Other Brand', model: 'Y-200', condition: 'Good', estimatedValue: 999 },
    });

    const res = await request.get('/api/v1/exchange/requests/brand', {
      headers: { Authorization: `Bearer ${brandToken}` },
    });
    expect(res.status()).toBe(200);
    const items = (await res.json()).data;
    expect(items.every((i) => i.brand === brandName)).toBe(true);
    expect(items.some((i) => i.model === 'Y-200')).toBe(false);
    // The console lists the customer by name, so the ref must come back resolved.
    if (items.length) expect(items[0].user.name).toBeDefined();
  });

  test('is matched before /requests/:id and needs brand scope', async ({ request }) => {
    // An unauthenticated call must fail the auth guard, not fall through to the
    // id lookup and 404 on a request literally named "brand".
    const res = await request.get('/api/v1/exchange/requests/brand');
    expect(res.status()).toBe(401);
  });
});

test.describe('technician app content — announcements and skill catalogue', () => {
  test('broadcasts an announcement and recalls it', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const createRes = await request.post('/api/v1/cms/announcements', {
      ...auth,
      data: { message: `Payout cycle moved to Wednesdays ${randomUUID()}`, scope: 'city', region: 'Delhi & NCR' },
    });
    expect(createRes.status()).toBe(201);
    const announcement = (await createRes.json()).data;
    expect(announcement.region).toBe('Delhi & NCR');

    const listRes = await request.get('/api/v1/cms/announcements', auth);
    expect(listRes.status()).toBe(200);
    expect((await listRes.json()).data.some((a) => a.id === announcement.id)).toBe(true);

    // Authoring is admin-only — the technician app only reads.
    expect((await request.get('/api/v1/cms/announcements')).status()).toBe(401);

    const delRes = await request.delete(`/api/v1/cms/announcements/${announcement.id}`, auth);
    expect(delRes.status()).toBe(200);
  });

  test('publishes a skill the technician app can read, and rejects a duplicate code', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const code = `AC-SPLIT-${randomUUID().slice(0, 8).toUpperCase()}`;

    const createRes = await request.post('/api/v1/cms/skills', {
      ...auth,
      data: { name: 'Split AC Installation', code, group: 'HVAC' },
    });
    expect(createRes.status()).toBe(201);
    const skill = (await createRes.json()).data;

    const dupRes = await request.post('/api/v1/cms/skills', {
      ...auth,
      data: { name: 'Different name', code },
    });
    expect(dupRes.status()).toBe(409);

    // The catalogue is public so a technician's profile can offer it.
    const publicRes = await request.get('/api/v1/cms/skills');
    expect(publicRes.status()).toBe(200);
    expect((await publicRes.json()).data.some((s) => s.code === code)).toBe(true);

    expect((await request.delete(`/api/v1/cms/skills/${skill.id}`)).status()).toBe(401);
    expect((await request.delete(`/api/v1/cms/skills/${skill.id}`, auth)).status()).toBe(200);
  });

  test('scopes the technician banner list by app so customer artwork never shows', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const title = `Safety First ${randomUUID().slice(0, 8)}`;

    const techRes = await request.post('/api/v1/cms/banners', {
      ...auth,
      data: { imageUrl: 'https://cdn.example/tech.png', title, description: 'Mask & gloves on all jobs.', app: 'technician' },
    });
    expect(techRes.status()).toBe(201);
    const customerRes = await request.post('/api/v1/cms/banners', {
      ...auth,
      data: { imageUrl: 'https://cdn.example/customer.png', app: 'customer' },
    });
    expect(customerRes.status()).toBe(201);

    const listRes = await request.get('/api/v1/cms/banners/admin?app=technician', auth);
    const banners = (await listRes.json()).data;
    expect(banners.some((b) => b.title === title)).toBe(true);
    expect(banners.every((b) => b.app === 'technician')).toBe(true);

    await request.delete(`/api/v1/cms/banners/${(await techRes.json()).data.id}`, auth);
    await request.delete(`/api/v1/cms/banners/${(await customerRes.json()).data.id}`, auth);
  });
});

test.describe('assignment console', () => {
  test('ranks candidates and assigns the operator\'s pick', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const customer = await createCustomer(request);
    const tech = await createTechnician(request);

    const srRes = await request.post('/api/v1/_dev/test-service-request', {
      data: { customerId: customer.userId || customer.id, category: 'AC' },
    });
    expect(srRes.status()).toBe(201);
    const srId = (await srRes.json()).data.id;

    const suggestRes = await request.get(`/api/v1/service-requests/${srId}/technician-suggestions`, auth);
    expect(suggestRes.status()).toBe(200);
    const ranked = (await suggestRes.json()).data;
    expect(ranked.length).toBeGreaterThan(0);
    // Scores are descending and carry the breakdown the console renders.
    for (let i = 1; i < ranked.length; i += 1) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    expect(ranked[0].breakdown).toBeDefined();

    const assignRes = await request.patch(`/api/v1/service-requests/${srId}/assign`, {
      ...auth,
      data: { technician: tech.technicianId },
    });
    expect(assignRes.status()).toBe(200);
    const assigned = (await assignRes.json()).data;
    expect(assigned.status).toBe('Assigned');
    expect(assigned.technician.id).toBe(tech.technicianId);
  });

  test('auto-assigns when no technician is named, and stays admin-only', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const customer = await createCustomer(request);
    await createTechnician(request);

    const srRes = await request.post('/api/v1/_dev/test-service-request', {
      data: { customerId: customer.userId || customer.id, category: 'AC' },
    });
    const srId = (await srRes.json()).data.id;

    expect((await request.patch(`/api/v1/service-requests/${srId}/assign`, { data: {} })).status()).toBe(401);

    const res = await request.patch(`/api/v1/service-requests/${srId}/assign`, { ...auth, data: {} });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.technician).toBeTruthy();
  });
});

test.describe('admin order fulfilment', () => {
  test('lists platform-wide orders and records real tracking details on dispatch', async ({ request }) => {
    const { token: adminToken } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${adminToken}` } };

    const productRes = await request.post('/api/v1/products', {
      ...auth,
      data: { category: 'AC', name: `E2E AC ${randomUUID()}`, price: 30000, stock: 5 },
    });
    expect(productRes.status()).toBe(201);
    const product = (await productRes.json()).data;

    const customer = await createCustomer(request);
    const customerToken = await loginAndVerify(request, {
      role: 'customer',
      identifier: customer.phone,
      password: 'password123',
    });
    const orderRes = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
      data: { items: [{ productId: product.id, quantity: 1 }], paymentMethod: 'Cash' },
    });
    expect(orderRes.status()).toBe(201);
    const order = (await orderRes.json()).data;

    // The admin sees an order they did not place — the console used to call the
    // customer-scoped /orders and saw nothing.
    const listed = await request.get('/api/v1/super-admin/orders?limit=200', auth);
    expect(listed.status()).toBe(200);
    expect((await listed.json()).data.some((o) => o.id === order.id)).toBe(true);

    const shipped = await request.patch(`/api/v1/super-admin/orders/${order.id}/status`, {
      ...auth,
      data: { status: 'Shipped', trackingNumber: 'BD-E2E-1', courierPartner: 'BlueDart' },
    });
    expect(shipped.status()).toBe(200);
    expect((await shipped.json()).data.trackingNumber).toBe('BD-E2E-1');

    // Backwards transitions are refused.
    const backwards = await request.patch(`/api/v1/super-admin/orders/${order.id}/status`, {
      ...auth,
      data: { status: 'Placed' },
    });
    expect(backwards.status()).toBe(400);
  });
});
