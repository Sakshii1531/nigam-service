import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/booking/booking.routes.js and
// backend/src/modules/service-requests/serviceRequest.routes.js end-to-end — the
// Phase 4 exit criterion ("full booking-creation -> service-request ->
// status-timeline flow").
//
// Every test creates its OWN category (unique key) + service + technician
// (specs = that same unique key) rather than reusing the shared seeded 'AC'
// category. Phase 8's real weighted assignmentEngine.js scores every
// Active+Available technician (not just specs-matching ones), but a specs match
// is worth a fixed 60-point skill-score gap versus any non-matching technician —
// with no city passed (proximity ties at 50 for everyone) and fresh
// rating/activeJobsCount (0 for every fixture), that gap dominates every other
// scoring factor combined, so the specialist created by this test always wins
// regardless of what other tests' technicians are doing concurrently. A unique
// category per test still matters: without it, a shared category means multiple
// tests' technicians would ALL score the 100-skill bonus, and workload/tie-break
// order between them would be genuinely nondeterministic under parallel workers.

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

async function createTechnician(request, { specs, availability = 'Available', serviceCityName, serviceStateName }) {
  const phone = uniquePhone();
  const createRes = await request.post('/api/v1/_dev/test-technician', {
    data: { phone, password: 'password123', specs, availability, serviceCityName, serviceStateName },
  });
  const { technicianId } = (await createRes.json()).data;
  const token = await loginAndVerify(request, { role: 'technician', identifier: phone, password: 'password123' });
  return { phone, technicianId, token };
}

/** category/service/technician all scoped to one random key — see file header. */
async function setupIsolatedFixture(request, { price = 299 } = {}) {
  const categoryKey = `E2E-Booking-${randomUUID()}`;

  const adminEmail = `booking-admin-${randomUUID()}@e2e.test`;
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

test.describe('POST /bookings — booking -> service-request -> auto-assign', () => {
  test('creates a booking with a server-priced total and an auto-assigned technician', async ({ request }) => {
    const { categoryKey, tech, customer } = await setupIsolatedFixture(request);

    const res = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category: categoryKey, serviceSlug: 'repair', quantity: 2 },
    });
    expect(res.status()).toBe(201);
    const { booking, serviceRequest, technician } = (await res.json()).data;

    expect(booking.totalPrice).toBe(598); // 299 * 2 from the catalog, not client-supplied
    expect(booking.technician).toBe(tech.technicianId);
    expect(technician.id).toBe(tech.technicianId);
    expect(serviceRequest.status).toBe('Assigned');
    expect(serviceRequest.timeline.map((t) => t.stepLabel)).toEqual(['New', 'Assigned']);
  });

  test('404s for an unknown service under a known category', async ({ request }) => {
    const { categoryKey, customer } = await setupIsolatedFixture(request);
    const res = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category: categoryKey, serviceSlug: 'not-a-real-service' },
    });
    expect(res.status()).toBe(404);
  });

  test('rejects a booking attempt from a technician role with 403', async ({ request }) => {
    const { categoryKey, tech } = await setupIsolatedFixture(request);
    const res = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: { category: categoryKey, serviceSlug: 'repair' },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('booking ownership', () => {
  test('rejects viewing another customer\'s booking with 403', async ({ request }) => {
    const { categoryKey, customer: owner } = await setupIsolatedFixture(request);
    const intruder = await createCustomer(request);

    const createRes = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: { category: categoryKey, serviceSlug: 'repair' },
    });
    const { booking } = (await createRes.json()).data;

    const res = await request.get(`/api/v1/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${intruder.token}` },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('service request status transitions', () => {
  async function createAssignedBooking(request) {
    const { categoryKey, tech, customer } = await setupIsolatedFixture(request);
    const createRes = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category: categoryKey, serviceSlug: 'repair' },
    });
    const { serviceRequest } = (await createRes.json()).data;
    return { srId: serviceRequest.id, tech, customer };
  }

  test('lets the assigned technician make a valid transition', async ({ request }) => {
    const { srId, tech } = await createAssignedBooking(request);
    const res = await request.patch(`/api/v1/service-requests/${srId}/status`, {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: { status: 'Engineer Accepted' },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe('Engineer Accepted');
  });

  test('rejects an out-of-order transition with 400', async ({ request }) => {
    const { srId, tech } = await createAssignedBooking(request);
    const res = await request.patch(`/api/v1/service-requests/${srId}/status`, {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: { status: 'Closed' },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects a transition attempted by the customer with 403', async ({ request }) => {
    const { srId, customer } = await createAssignedBooking(request);
    const res = await request.patch(`/api/v1/service-requests/${srId}/status`, {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { status: 'Engineer Accepted' },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('POST /bookings/:id/cancel', () => {
  test('cancels the booking and its linked service request', async ({ request }) => {
    const { categoryKey, customer } = await setupIsolatedFixture(request);
    const createRes = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category: categoryKey, serviceSlug: 'repair' },
    });
    const { booking, serviceRequest } = (await createRes.json()).data;

    const cancelRes = await request.post(`/api/v1/bookings/${booking.id}/cancel`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect(cancelRes.status()).toBe(200);
    expect((await cancelRes.json()).data.status).toBe('Cancelled');

    const srRes = await request.get(`/api/v1/service-requests/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect((await srRes.json()).data.status).toBe('Cancelled');
  });
});

test.describe('POST /bookings — territory isolation (Indore vs Delhi)', () => {
  test('strictly assigns the technician in Indore for an Indore booking, never the Delhi technician', async ({ request }) => {
    const categoryKey = `E2E-Territory-${randomUUID()}`;

    const adminEmail = `admin-territory-${randomUUID()}@e2e.test`;
    await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
    const adminToken = await loginAndVerify(request, { role: 'super_admin', identifier: adminEmail, password: 'password123' });

    await request.post('/api/v1/catalog/categories', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { key: categoryKey, name: categoryKey },
    });
    await request.post(`/api/v1/catalog/categories/${categoryKey}/services`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { slug: 'repair', name: 'Repair', price: 350 },
    });

    // Create a Delhi technician
    const delhiTech = await createTechnician(request, {
      specs: [categoryKey],
      serviceCityName: 'Delhi',
      serviceStateName: 'Delhi',
    });

    // Create an Indore technician
    const indoreTech = await createTechnician(request, {
      specs: [categoryKey],
      serviceCityName: 'Indore',
      serviceStateName: 'Madhya Pradesh',
    });

    const customer = await createCustomer(request);

    // Customer places a booking located in Indore, Madhya Pradesh
    const res = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: {
        category: categoryKey,
        serviceSlug: 'repair',
        address: {
          city: 'Indore',
          state: 'Madhya Pradesh',
          house: '123 Vijay Nagar',
        },
      },
    });

    expect(res.status()).toBe(201);
    const { booking, serviceRequest } = (await res.json()).data;

    // Must be assigned strictly to the Indore technician
    expect(booking.technician).toBe(indoreTech.technicianId);
    expect(booking.technician).not.toBe(delhiTech.technicianId);
    expect(serviceRequest.status).toBe('Assigned');
  });

  test('does not assign an out-of-city technician when booking in an unserviced city and only Delhi technician exists', async ({ request }) => {
    const categoryKey = `E2E-Territory-Solo-${randomUUID()}`;

    const adminEmail = `admin-territory-solo-${randomUUID()}@e2e.test`;
    await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
    const adminToken = await loginAndVerify(request, { role: 'super_admin', identifier: adminEmail, password: 'password123' });

    await request.post('/api/v1/catalog/categories', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { key: categoryKey, name: categoryKey },
    });
    await request.post(`/api/v1/catalog/categories/${categoryKey}/services`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { slug: 'repair', name: 'Repair', price: 350 },
    });

    // Only Delhi technician is created
    const delhiTech = await createTechnician(request, {
      specs: [categoryKey],
      serviceCityName: 'Delhi',
      serviceStateName: 'Delhi',
    });

    const customer = await createCustomer(request);

    // Customer places booking in Bhopal where no technician exists
    const res = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: {
        category: categoryKey,
        serviceSlug: 'repair',
        address: {
          city: 'Bhopal',
          state: 'Madhya Pradesh',
          house: '456 MP Nagar',
        },
      },
    });

    expect(res.status()).toBe(201);
    const { booking, serviceRequest } = (await res.json()).data;

    // Must NOT assign Delhi technician!
    expect(booking.technician).not.toBe(delhiTech.technicianId);
    expect(booking.technician).toBeNull();
  });
});

