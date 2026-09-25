import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createTestOffering } from '../catalogueFixture.js';

// Covers backend/src/modules/catalog/catalog.routes.js. Read endpoints exercise
// the real category data seeded by global-setup.js (backend/scripts/seed.js:
// categorySeedData.js + the Master Catalogue seed). Admin-write
// tests create their own uniquely-keyed fixtures so parallel workers don't collide.

async function getOtpCode(request, identifier) {
  const res = await request.get(`/api/v1/_dev/last-otp/${encodeURIComponent(identifier)}`);
  const body = await res.json();
  return body.data.code;
}

async function loginAsFreshAdmin(request) {
  const email = `catalog-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  await request.post('/api/v1/auth/login', { data: { role: 'super_admin', identifier: email, password: 'password123' } });
  const code = await getOtpCode(request, email);
  const verifyRes = await request.post('/api/v1/auth/otp/verify', { data: { role: 'super_admin', identifier: email, code } });
  return (await verifyRes.json()).data.accessToken;
}

test.describe('GET /catalog/categories', () => {
  test('includes the seeded AC category with its bookable product types and services — no prices', async ({ request }) => {
    const res = await request.get('/api/v1/catalog/categories');
    expect(res.status()).toBe(200);
    const body = await res.json();

    const ac = body.data.find((c) => c.key === 'AC');
    expect(ac).toBeTruthy();
    expect(ac.productTypes.some((pt) => pt.id === 'split')).toBe(true);
    expect(ac.services.some((s) => s.id === 'installation')).toBe(true);
    expect(JSON.stringify(ac)).not.toMatch(/"price"/);
  });

  test('seeded the appliance categories', async ({ request }) => {
    const res = await request.get('/api/v1/catalog/categories');
    const body = await res.json();
    const keys = body.data.map((c) => c.key);
    for (const expected of ['AC', 'Washing Machine', 'Refrigerator', 'TV', 'RO Water Purifier', 'Geyser', 'Microwave', 'Chimney', 'Air Cooler']) {
      expect(keys).toContain(expected);
    }
  });
});

test.describe('GET /catalog/categories/:key', () => {
  test('returns a single category', async ({ request }) => {
    const res = await request.get('/api/v1/catalog/categories/AC');
    expect(res.status()).toBe(200);
    expect((await res.json()).data.name).toBe('AC');
  });

  test('404s for an unknown key', async ({ request }) => {
    const res = await request.get('/api/v1/catalog/categories/NotARealCategory');
    expect(res.status()).toBe(404);
  });
});

test.describe('admin-editable catalog writes', () => {
  test('rejects category creation with no auth', async ({ request }) => {
    const res = await request.post('/api/v1/catalog/categories', { data: { key: `X-${randomUUID()}`, name: 'X' } });
    expect(res.status()).toBe(401);
  });

  test('lets a super_admin create a category; its services come from Master Catalogue offerings', async ({ request }) => {
    const token = await loginAsFreshAdmin(request);
    const key = `E2E-${randomUUID()}`;

    const createRes = await request.post('/api/v1/catalog/categories', {
      headers: { Authorization: `Bearer ${token}` },
      data: { key, name: 'E2E Category' },
    });
    expect(createRes.status()).toBe(201);
    expect((await createRes.json()).data.services).toEqual([]);

    await createTestOffering(request, token, key, { price: 123, serviceName: 'Service A' });
    const body = await (await request.get(`/api/v1/catalog/categories/${key}`)).json();
    expect(body.data.services).toEqual([expect.objectContaining({ name: 'Service A' })]);
    expect(body.data.services[0].price).toBeUndefined();
  });
});
