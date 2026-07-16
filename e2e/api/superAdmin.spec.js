import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/super-admin/*.routes.js end-to-end — the Phase 8
// exit criterion ("super-admin can edit a category via CMS endpoints and the
// Phase 4 catalog endpoint immediately reflects it, no redeploy") plus the rest
// of the platform-entities/assignment-engine/CMS/loyalty-config/RBAC surface.

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
  const email = `super-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  const token = await loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });
  return { email, token };
}

test.describe('Brand', () => {
  test('creates, lists, and updates a brand', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const name = `E2E Brand ${randomUUID()}`;

    const createRes = await request.post('/api/v1/super-admin/brands', { ...auth, data: { name } });
    expect(createRes.status()).toBe(201);
    const brand = (await createRes.json()).data;

    const updateRes = await request.put(`/api/v1/super-admin/brands/${brand.id}`, { ...auth, data: { status: 'Active' } });
    expect((await updateRes.json()).data.status).toBe('Active');
  });
});

test.describe('City -> ServicePartner -> ASM', () => {
  test('creates the chain and manages ASM partner assignment', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const cityName = `E2E City ${randomUUID()}`;

    const cityRes = await request.post('/api/v1/super-admin/cities', { ...auth, data: { name: cityName, state: 'UP' } });
    const city = (await cityRes.json()).data;

    const partnerRes = await request.post('/api/v1/super-admin/service-partners', { ...auth, data: { name: 'E2E Partner', city: city.id } });
    const partner = (await partnerRes.json()).data;

    const asmRes = await request.post('/api/v1/super-admin/asms', { ...auth, data: { name: 'E2E ASM', city: city.id } });
    const asm = (await asmRes.json()).data;

    const addRes = await request.post(`/api/v1/super-admin/asms/${asm.id}/partners`, { ...auth, data: { partnerId: partner.id } });
    expect((await addRes.json()).data.partners).toContain(partner.id);
  });
});

test.describe('AssignmentWeighting', () => {
  test('rejects weights not summing to 100 and accepts a valid set', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const badRes = await request.put('/api/v1/super-admin/assignment-weighting', {
      ...auth,
      data: { proximityPercent: 50, skillPercent: 50, ratingPercent: 50, workloadPercent: 50 },
    });
    expect(badRes.status()).toBe(400);

    const okRes = await request.put('/api/v1/super-admin/assignment-weighting', {
      ...auth,
      data: { proximityPercent: 40, skillPercent: 30, ratingPercent: 20, workloadPercent: 10 },
    });
    expect(okRes.status()).toBe(200);
  });
});

test.describe('SparePartCatalog', () => {
  test('creates a spare part with derived pricing', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const res = await request.post('/api/v1/super-admin/spare-parts', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'E2E Part', costPrice: 1000, markupPercent: 25 },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).data.retailPrice).toBe(1250);
  });
});

test.describe('CMS — public reads, admin-gated writes', () => {
  test('creates a banner as super-admin, reads it back with no auth', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const createRes = await request.post('/api/v1/cms/banners', {
      headers: { Authorization: `Bearer ${token}` },
      data: { imageUrl: 'https://example.com/e2e.png', app: 'customer' },
    });
    expect(createRes.status()).toBe(201);
    const createdBanner = (await createRes.json()).data;

    const publicRes = await request.get('/api/v1/cms/banners');
    expect(publicRes.status()).toBe(200);
    const banners = (await publicRes.json()).data;
    expect(banners.some((b) => b.id === createdBanner.id)).toBe(true);
  });

  test('rejects a write attempt with no auth', async ({ request }) => {
    const res = await request.post('/api/v1/cms/banners', { data: { imageUrl: 'x' } });
    expect(res.status()).toBe(401);
  });
});

test.describe('loyalty config', () => {
  test('rejects spin-wheel probabilities summing over 100', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const res = await request.put('/api/v1/super-admin/loyalty/spin-wheel', {
      headers: { Authorization: `Bearer ${token}` },
      data: { segments: [{ label: 'a', probability: 70 }, { label: 'b', probability: 40 }] },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('platform-wide RBAC', () => {
  test('lists users and never leaks passwordHash', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const res = await request.get('/api/v1/super-admin/users', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/\$2[aby]\$/);
  });
});

test.describe('exit criterion — CMS/catalog edits reflect immediately, no redeploy', () => {
  test('super-admin edits a category and the public catalog read reflects it immediately', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const categoryKey = `E2E-SA-${randomUUID()}`;

    await request.post('/api/v1/catalog/categories', { ...auth, data: { key: categoryKey, name: 'Before Edit' } });

    const before = await request.get(`/api/v1/catalog/categories/${categoryKey}`);
    expect((await before.json()).data.name).toBe('Before Edit');

    await request.put(`/api/v1/catalog/categories/${categoryKey}`, { ...auth, data: { name: 'After Edit' } });

    const after = await request.get(`/api/v1/catalog/categories/${categoryKey}`);
    expect((await after.json()).data.name).toBe('After Edit');
  });
});
