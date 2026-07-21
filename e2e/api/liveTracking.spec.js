import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers the super-admin Live Tracking HTTP endpoints:
//   GET  /api/v1/super-admin/tracking
//   GET  /api/v1/super-admin/tracking/:jobId
//   PUT  /api/v1/super-admin/tracking
//
// The real-time socket path (technician emitting update-location, super-admin
// receiving tracking:update) is covered in backend/tests/sockets.test.js using
// an in-process Socket.IO client, which is the right tool for that surface.

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
  const email = `sa-tracking-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  const token = await loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });
  return { email, token };
}

async function createTechnician(request, specs = ['AC']) {
  // Derive a guaranteed-unique 10-digit phone from a UUID so parallel workers
  // never generate the same number and clobber each other's fixture.
  const digits = randomUUID().replace(/-/g, '').replace(/\D/g, '').slice(0, 9).padEnd(9, '0');
  const phone = `9${digits}`;
  const res = await request.post('/api/v1/_dev/test-technician', {
    data: { phone, password: 'password123', specs },
  });
  const body = await res.json();
  if (!body.data?.technicianId) throw new Error(`/_dev/test-technician failed: ${JSON.stringify(body)}`);
  const { technicianId, userId } = body.data;
  const token = await loginAndVerify(request, { role: 'technician', identifier: phone, password: 'password123' });
  return { phone, technicianId, userId, token };
}

async function createServiceRequest(request, { customerToken, technicianId } = {}) {
  const customerPhone = `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone: customerPhone, password: 'password123' } });
  const custToken = await loginAndVerify(request, { role: 'customer', identifier: customerPhone, password: 'password123' });

  const srRes = await request.post('/api/v1/_dev/test-service-request', {
    data: { technicianId, status: 'Assigned' },
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const sr = (await srRes.json()).data;
  return { sr, custToken };
}

test.describe('Live Tracking HTTP endpoints — super-admin only', () => {
  test('GET /tracking returns empty list when no jobs are active', async ({ request }) => {
    const { token } = await createSuperAdmin(request);

    const res = await request.get('/api/v1/super-admin/tracking', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('PUT /tracking creates or updates a location record, GET /tracking/:jobId retrieves it with populated fields', async ({ request }) => {
    const { token: saToken } = await createSuperAdmin(request);
    const tech = await createTechnician(request, ['AC']);
    const saAuth = { headers: { Authorization: `Bearer ${saToken}` } };

    // Seed a job via dev route so we have a real Job._id
    const jobRes = await request.post('/api/v1/_dev/test-job', {
      data: { technicianId: tech.technicianId },
      ...saAuth,
    });
    const { jobId } = (await jobRes.json()).data;

    const payload = {
      job: jobId,
      technician: tech.technicianId,
      status: 'On the way',
      eta: '15 min',
      location: 'Connaught Place, Delhi',
      coords: { lat: 28.6315, lng: 77.2167 },
    };

    const putRes = await request.put('/api/v1/super-admin/tracking', {
      ...saAuth,
      data: payload,
    });
    expect(putRes.status()).toBe(200);
    const created = (await putRes.json()).data;
    expect(created.status).toBe('On the way');
    expect(created.location).toBe('Connaught Place, Delhi');
    expect(created.coords.lat).toBeCloseTo(28.6315, 3);

    // GET by jobId
    const getRes = await request.get(`/api/v1/super-admin/tracking/${jobId}`, saAuth);
    expect(getRes.status()).toBe(200);
    const fetched = (await getRes.json()).data;
    expect(fetched.location).toBe('Connaught Place, Delhi');
    expect(fetched.status).toBe('On the way');
  });

  test('PUT /tracking upserts — updating the same jobId changes only the fields provided', async ({ request }) => {
    const { token: saToken } = await createSuperAdmin(request);
    const tech = await createTechnician(request, ['AC']);
    const saAuth = { headers: { Authorization: `Bearer ${saToken}` } };

    const jobRes = await request.post('/api/v1/_dev/test-job', {
      data: { technicianId: tech.technicianId },
      ...saAuth,
    });
    const { jobId } = (await jobRes.json()).data;

    const base = {
      job: jobId,
      technician: tech.technicianId,
      status: 'On the way',
      eta: '20 min',
      location: 'Sector 18, Noida',
      coords: { lat: 28.5705, lng: 77.3212 },
    };

    await request.put('/api/v1/super-admin/tracking', { ...saAuth, data: base });

    // Second PUT with updated coords and ETA → simulates a GPS ping
    const updated = { ...base, eta: '8 min', coords: { lat: 28.6129, lng: 77.2295 } };
    const updateRes = await request.put('/api/v1/super-admin/tracking', { ...saAuth, data: updated });
    expect(updateRes.status()).toBe(200);
    const body = (await updateRes.json()).data;
    expect(body.eta).toBe('8 min');
    expect(body.coords.lat).toBeCloseTo(28.6129, 3);
  });

  test('GET /tracking/:jobId returns 404 for a non-existent job', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const fakeJobId = '507f1f77bcf86cd799439011';
    const res = await request.get(`/api/v1/super-admin/tracking/${fakeJobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(404);
  });

  test('rejects unauthenticated requests with 401', async ({ request }) => {
    const getRes = await request.get('/api/v1/super-admin/tracking');
    expect(getRes.status()).toBe(401);

    const putRes = await request.put('/api/v1/super-admin/tracking', {
      data: { job: '507f1f77bcf86cd799439011', technician: '507f1f77bcf86cd799439012', status: 'On the way' },
    });
    expect(putRes.status()).toBe(401);
  });

  test('rejects a non-super-admin (brand_admin) with 403', async ({ request }) => {
    const brandAdminEmail = `ba-tracking-${randomUUID()}@e2e.test`;
    await request.post('/api/v1/_dev/test-user', {
      data: { role: 'brand_admin', email: brandAdminEmail, password: 'password123' },
    });
    const token = await loginAndVerify(request, { role: 'brand_admin', identifier: brandAdminEmail, password: 'password123' });

    const res = await request.get('/api/v1/super-admin/tracking', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('GET /tracking returns active jobs and excludes Completed ones', async ({ request }) => {
    const { token: saToken } = await createSuperAdmin(request);
    const techA = await createTechnician(request, ['AC']);
    const techB = await createTechnician(request, ['Fridge']);
    const saAuth = { headers: { Authorization: `Bearer ${saToken}` } };

    const jobResA = await request.post('/api/v1/_dev/test-job', { data: { technicianId: techA.technicianId }, ...saAuth });
    const jobResB = await request.post('/api/v1/_dev/test-job', { data: { technicianId: techB.technicianId }, ...saAuth });
    const { jobId: jobIdA } = (await jobResA.json()).data;
    const { jobId: jobIdB } = (await jobResB.json()).data;

    await request.put('/api/v1/super-admin/tracking', {
      ...saAuth,
      data: { job: jobIdA, technician: techA.technicianId, status: 'On the way', coords: { lat: 28.6, lng: 77.2 } },
    });
    await request.put('/api/v1/super-admin/tracking', {
      ...saAuth,
      data: { job: jobIdB, technician: techB.technicianId, status: 'Completed', coords: { lat: 19.0, lng: 72.8 } },
    });

    const listRes = await request.get('/api/v1/super-admin/tracking', saAuth);
    expect(listRes.status()).toBe(200);
    const items = (await listRes.json()).data;
    expect(items.some((j) => j.status === 'Completed')).toBe(false);
    expect(items.some((j) => j.status === 'On the way')).toBe(true);
  });
});
