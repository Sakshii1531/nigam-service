import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/brand-admin/*.routes.js end-to-end — the Phase 7
// exit criterion ("two seeded brands, verify brand A's admin can never see
// brand B's requests/invoices — cross-tenant isolation test").
//
// Brand and non-booking ServiceRequest both have no real HTTP surface yet
// (Brand is Phase 8 scope; a Brand-Warranty complaint-raising flow is deferred —
// same reasoning as e2e/api/technician.spec.js's AMC fixtures), so this spec
// uses the NODE_ENV=test-only /_dev/test-brand and /_dev/test-service-request
// fixture routes to get real, separate tenants to test isolation against.

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
  const createRes = await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone, password: 'password123' } });
  const { id } = (await createRes.json()).data;
  const token = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });
  return { id, phone, token };
}

async function createTechnician(request) {
  const phone = uniquePhone();
  const createRes = await request.post('/api/v1/_dev/test-technician', { data: { phone, password: 'password123', specs: ['AC'] } });
  const { technicianId } = (await createRes.json()).data;
  return { technicianId };
}

/** A fresh Brand tenant + its own brand_admin account, isolated by a random
 * email/name per call so parallel workers never collide (same isolation
 * reasoning as booking.spec.js's setupIsolatedFixture). */
async function createBrandWithAdmin(request) {
  const brandRes = await request.post('/api/v1/_dev/test-brand', { data: { name: `E2E Brand ${randomUUID()}` } });
  const { id: brandId } = (await brandRes.json()).data;

  const email = `brand-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'brand_admin', email, password: 'password123', brand: brandId } });
  const token = await loginAndVerify(request, { role: 'brand_admin', identifier: email, password: 'password123' });

  return { brandId, token };
}

async function createServiceRequestForBrand(request, { brandId, customerId, technicianId }) {
  const res = await request.post('/api/v1/_dev/test-service-request', {
    data: { customerId, technicianId, category: 'AC', brand: brandId },
  });
  return (await res.json()).data.id;
}

test.describe('cross-tenant isolation — the Phase 7 exit criterion', () => {
  test('brand A admin can never see brand B\'s service requests or invoices', async ({ request }) => {
    const brandA = await createBrandWithAdmin(request);
    const brandB = await createBrandWithAdmin(request);
    const customer = await createCustomer(request);
    const technician = await createTechnician(request);

    const srA = await createServiceRequestForBrand(request, { brandId: brandA.brandId, customerId: customer.id, technicianId: technician.technicianId });

    const invoiceRes = await request.post('/api/v1/brand/invoices', {
      headers: { Authorization: `Bearer ${brandA.token}` },
      data: { serviceRequest: srA, customer: customer.id, technician: technician.technicianId, serviceCharge: 500 },
    });
    expect(invoiceRes.status()).toBe(201);
    const invoiceA = (await invoiceRes.json()).data;

    // Brand A sees its own data.
    const listA = await request.get('/api/v1/service-requests', { headers: { Authorization: `Bearer ${brandA.token}` } });
    expect((await listA.json()).data).toHaveLength(1);

    // Brand B sees none of it, in lists or by direct id.
    const listB = await request.get('/api/v1/service-requests', { headers: { Authorization: `Bearer ${brandB.token}` } });
    expect((await listB.json()).data).toHaveLength(0);

    const getSrB = await request.get(`/api/v1/service-requests/${srA}`, { headers: { Authorization: `Bearer ${brandB.token}` } });
    expect(getSrB.status()).toBe(403);

    const transitionB = await request.patch(`/api/v1/service-requests/${srA}/status`, {
      headers: { Authorization: `Bearer ${brandB.token}` },
      data: { status: 'Engineer Accepted' },
    });
    expect(transitionB.status()).toBe(403);

    const invoiceListB = await request.get('/api/v1/brand/invoices', { headers: { Authorization: `Bearer ${brandB.token}` } });
    expect((await invoiceListB.json()).data).toHaveLength(0);

    const getInvoiceB = await request.get(`/api/v1/brand/invoices/${invoiceA.id}`, { headers: { Authorization: `Bearer ${brandB.token}` } });
    expect(getInvoiceB.status()).toBe(403);
  });

  test('rate cards, teams, and catalog entries never leak across brands', async ({ request }) => {
    const brandA = await createBrandWithAdmin(request);
    const brandB = await createBrandWithAdmin(request);

    await request.put('/api/v1/brand/rate-cards', {
      headers: { Authorization: `Bearer ${brandA.token}` },
      data: { category: 'AC', serviceType: 'Repair', laborRate: 499 },
    });
    await request.post('/api/v1/brand/teams', {
      headers: { Authorization: `Bearer ${brandA.token}` },
      data: { name: 'Team A', department: 'Field Service' },
    });

    const rateCardsB = await request.get('/api/v1/brand/rate-cards', { headers: { Authorization: `Bearer ${brandB.token}` } });
    expect((await rateCardsB.json()).data).toHaveLength(0);
    const teamsB = await request.get('/api/v1/brand/teams', { headers: { Authorization: `Bearer ${brandB.token}` } });
    expect((await teamsB.json()).data).toHaveLength(0);
  });
});

test.describe('brand catalog hierarchy', () => {
  test('maps a master service onto a brand product through a sub-brand', async ({ request }) => {
    const brandA = await createBrandWithAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${brandA.token}` } };

    const msRes = await request.post('/api/v1/brand/catalog/master-services', { ...auth, data: { name: 'AC Repair', type: 'Repair', charge: 499 } });
    const masterService = (await msRes.json()).data;

    const sbRes = await request.post('/api/v1/brand/catalog/sub-brands', { ...auth, data: { name: 'LG Appliances' } });
    const subBrand = (await sbRes.json()).data;

    const productRes = await request.post(`/api/v1/brand/catalog/sub-brands/${subBrand.id}/products`, {
      ...auth,
      data: { name: 'LG Split AC', services: [masterService.id] },
    });
    expect(productRes.status()).toBe(201);
    const product = (await productRes.json()).data;
    expect(product.services).toHaveLength(1);
  });
});

test.describe('brand users', () => {
  test('invites a brand user and the response never contains a bcrypt hash', async ({ request }) => {
    const brandA = await createBrandWithAdmin(request);

    const res = await request.post('/api/v1/brand/users', {
      headers: { Authorization: `Bearer ${brandA.token}` },
      data: { name: 'Agent Smith', email: `agent-${randomUUID()}@e2e.test`, password: 'password123' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/\$2[aby]\$/);
  });
});

test.describe('replacement approvals and returns', () => {
  test('creates a replacement approval and approves it', async ({ request }) => {
    const brandA = await createBrandWithAdmin(request);
    const customer = await createCustomer(request);
    const technician = await createTechnician(request);
    const srA = await createServiceRequestForBrand(request, { brandId: brandA.brandId, customerId: customer.id, technicianId: technician.technicianId });

    const createRes = await request.post('/api/v1/brand/replacement-approvals', {
      headers: { Authorization: `Bearer ${brandA.token}` },
      data: { serviceRequest: srA, product: 'AC', reason: 'Compressor dead' },
    });
    expect(createRes.status()).toBe(201);
    const approval = (await createRes.json()).data;

    const approveRes = await request.patch(`/api/v1/brand/replacement-approvals/${approval.id}/status`, {
      headers: { Authorization: `Bearer ${brandA.token}` },
      data: { status: 'Approved' },
    });
    expect((await approveRes.json()).data.status).toBe('Approved');
  });
});
