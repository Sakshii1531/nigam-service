import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

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

async function createTechnician(request, { specs, availability = 'Available' }) {
  const phone = uniquePhone();
  const createRes = await request.post('/api/v1/_dev/test-technician', {
    data: { phone, password: 'password123', specs, availability },
  });
  const { technicianId } = (await createRes.json()).data;
  const token = await loginAndVerify(request, { role: 'technician', identifier: phone, password: 'password123' });
  return { phone, technicianId, token };
}

async function setupIsolatedFixture(request, { price = 299 } = {}) {
  const categoryKey = `E2E-Warranty-${randomUUID()}`;

  const adminEmail = `warranty-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const adminToken = await loginAndVerify(request, { role: 'super_admin', identifier: adminEmail, password: 'password123' });

  await request.post('/api/v1/catalog/categories', {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { key: categoryKey, name: categoryKey },
  });
  await request.post(`/api/v1/catalog/categories/${categoryKey}/services`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { slug: 'repair', name: 'Repair', price },
  });

  const tech = await createTechnician(request, { specs: [categoryKey] });
  const customer = await createCustomer(request);

  return { categoryKey, tech, customer };
}

test.describe('Smart Warranty Detection E2E', () => {
  test('detects In-Warranty status and applies pricing benefits (price = 0) automatically', async ({ request }) => {
    const { categoryKey, customer } = await setupIsolatedFixture(request);
    const recentDate = new Date().toISOString();

    const res = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: {
        category: categoryKey,
        serviceSlug: 'repair',
        brand: 'Demo Brand',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: { date: '2026-07-21', time: '10:00 AM' },
        address: { type: 'Home', pincode: '226001' },
        purchaseDate: recentDate,
        fullName: 'E2E Warranty User',
        mobile: customer.phone,
        paymentMode: 'after',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.booking.totalPrice).toBe(0); // Covered by base brand warranty!
    expect(body.data.serviceRequest.warranty).toBe('In Warranty');
  });

  test('auto-infers Job.type as "Brand Warranty" when accepted by technician without explicit flags', async ({ request }) => {
    const { categoryKey, tech, customer } = await setupIsolatedFixture(request);
    const recentDate = new Date().toISOString();

    // 1. Customer creates an in-warranty booking
    const res = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: {
        category: categoryKey,
        serviceSlug: 'repair',
        brand: 'Demo Brand',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: { date: '2026-07-21', time: '10:00 AM' },
        address: { type: 'Home', pincode: '226001' },
        purchaseDate: recentDate,
        fullName: 'E2E Warranty User 2',
        mobile: customer.phone,
        paymentMode: 'after',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    const serviceRequestId = body.data.serviceRequest.id;

    // 2. Technician accepts the job without supplying an explicit `type` parameter
    const acceptRes = await request.post(`/api/v1/tech/jobs/accept/${serviceRequestId}`, {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: {}, // NO explicit type passed
    });

    expect(acceptRes.status()).toBe(200);
    const acceptBody = await acceptRes.json();
    expect(acceptBody.data.type).toBe('Brand Warranty'); // System auto-detected and applied the type!
  });
});
