import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/reviews/review.routes.js — Phase 10 filled this
// gap (model existed since Phase 1, no service/routes until now).

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
function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}
async function createCustomer(request) {
  const phone = uniquePhone();
  const res = await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone, password: 'password123' } });
  const { id } = (await res.json()).data;
  const token = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });
  return { id, phone, token };
}
async function createTechnician(request) {
  const phone = uniquePhone();
  const res = await request.post('/api/v1/_dev/test-technician', { data: { phone, password: 'password123', specs: ['AC'] } });
  const { technicianId } = (await res.json()).data;
  return { phone, technicianId };
}

test.describe('reviews', () => {
  test('a customer reviews a completed service request, publicly visible on the technician\'s profile', async ({ request }) => {
    const customer = await createCustomer(request);
    const tech = await createTechnician(request);

    const srRes = await request.post('/api/v1/_dev/test-service-request', {
      data: { customerId: customer.id, technicianId: tech.technicianId, category: 'AC' },
    });
    const { id: serviceRequestId } = (await srRes.json()).data;

    const reviewRes = await request.post('/api/v1/reviews', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { serviceRequest: serviceRequestId, rating: 5, comment: 'Excellent work', tags: ['On time'] },
    });
    expect(reviewRes.status()).toBe(201);
    const review = (await reviewRes.json()).data;
    expect(review.technician).toBe(tech.technicianId);

    const publicRes = await request.get(`/api/v1/reviews/technicians/${tech.technicianId}`);
    expect(publicRes.status()).toBe(200);
    const list = (await publicRes.json()).data;
    expect(list.some((r) => r.id === review.id)).toBe(true);

    // Duplicate review on the same service request is rejected.
    const dupeRes = await request.post('/api/v1/reviews', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { serviceRequest: serviceRequestId, rating: 1 },
    });
    expect(dupeRes.status()).toBe(409);
  });

  test('rejects reviewing a service request that belongs to a different customer', async ({ request }) => {
    const owner = await createCustomer(request);
    const intruder = await createCustomer(request);
    const tech = await createTechnician(request);

    const srRes = await request.post('/api/v1/_dev/test-service-request', {
      data: { customerId: owner.id, technicianId: tech.technicianId, category: 'AC' },
    });
    const { id: serviceRequestId } = (await srRes.json()).data;

    const res = await request.post('/api/v1/reviews', {
      headers: { Authorization: `Bearer ${intruder.token}` },
      data: { serviceRequest: serviceRequestId, rating: 3 },
    });
    expect(res.status()).toBe(403);
  });
});
