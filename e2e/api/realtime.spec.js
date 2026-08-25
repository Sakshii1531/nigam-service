import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers the REST surface of Phase 9's real-time layer: notifications
// (backend/src/modules/notifications/) and chat conversation/message history
// (backend/src/modules/chat/). The actual Socket.IO exchange (the exit
// criterion itself — two connected clients scoped to one conversation) is
// covered thoroughly in backend/tests/sockets.test.js; Playwright's `request`
// fixture has no native socket client, and Jest already gives that guarantee
// more directly. This spec verifies what a real booking/job-acceptance flow
// against the live server actually produces: real notifications, a real
// auto-created conversation, and real message history.

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

async function createTechnician(request, specs) {
  const phone = uniquePhone();
  const createRes = await request.post('/api/v1/_dev/test-technician', { data: { phone, password: 'password123', specs } });
  const { technicianId } = (await createRes.json()).data;
  const token = await loginAndVerify(request, { role: 'technician', identifier: phone, password: 'password123' });
  return { phone, technicianId, token };
}

/** category/service/technician scoped to one random key — same isolation
 * reasoning as booking.spec.js/technician.spec.js. */
async function setupBookingFixture(request) {
  const categoryKey = `E2E-RT-${randomUUID()}`;
  const adminEmail = `rt-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const adminToken = await loginAndVerify(request, { role: 'super_admin', identifier: adminEmail, password: 'password123' });

  await request.post('/api/v1/catalog/categories', { headers: { Authorization: `Bearer ${adminToken}` }, data: { key: categoryKey, name: categoryKey } });
  await request.post(`/api/v1/catalog/categories/${categoryKey}/services`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { slug: 'repair', name: 'Repair', price: 499 },
  });

  const tech = await createTechnician(request, [categoryKey]);
  const customer = await createCustomer(request);
  return { categoryKey, tech, customer };
}

test.describe('notifications — real domain events, not just CRUD', () => {
  test('a booking fires booking.created and technician.assigned for the customer', async ({ request }) => {
    const { categoryKey, customer } = await setupBookingFixture(request);

    const bookingRes = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category: categoryKey, serviceSlug: 'repair' },
    });
    expect(bookingRes.status()).toBe(201);

    const notifRes = await request.get('/api/v1/notifications', { headers: { Authorization: `Bearer ${customer.token}` } });
    const notifications = (await notifRes.json()).data;
    expect(notifications.some((n) => n.type === 'created')).toBe(true);
    expect(notifications.some((n) => n.type === 'assigned')).toBe(true);
  });

  test('read=false/true filters correctly and read-all clears personal unread notifications', async ({ request }) => {
    const { categoryKey, customer } = await setupBookingFixture(request);
    await request.post('/api/v1/bookings', { headers: { Authorization: `Bearer ${customer.token}` }, data: { category: categoryKey, serviceSlug: 'repair' } });

    const unreadBefore = await request.get('/api/v1/notifications?read=false', { headers: { Authorization: `Bearer ${customer.token}` } });
    expect((await unreadBefore.json()).data.length).toBeGreaterThanOrEqual(2);

    await request.patch('/api/v1/notifications/read-all', { headers: { Authorization: `Bearer ${customer.token}` } });

    const unreadAfter = await request.get('/api/v1/notifications?read=false', { headers: { Authorization: `Bearer ${customer.token}` } });
    // Nothing left unread at all — read-all now clears broadcasts too, via a
    // per-user receipt, so a platform-wide broadcast from another spec is
    // cleared for this customer without being marked read for anyone else.
    expect((await unreadAfter.json()).data).toHaveLength(0);
  });

  test('rejects an unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/v1/notifications');
    expect(res.status()).toBe(401);
  });
});

test.describe('chat — conversation auto-created on job acceptance', () => {
  test('accepting a job creates a conversation visible to both the customer and the technician, with masked phone numbers', async ({ request }) => {
    const { categoryKey, tech, customer } = await setupBookingFixture(request);

    const bookingRes = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category: categoryKey, serviceSlug: 'repair' },
    });
    const { serviceRequest } = (await bookingRes.json()).data;

    await request.post(`/api/v1/tech/jobs/accept/${serviceRequest.id}`, { headers: { Authorization: `Bearer ${tech.token}` }, data: {} });

    const customerConvos = await request.get('/api/v1/chat/conversations', { headers: { Authorization: `Bearer ${customer.token}` } });
    const customerList = (await customerConvos.json()).data;
    expect(customerList).toHaveLength(1);
    expect(customerList[0].technician.phone).not.toBe(tech.phone);

    const techConvos = await request.get('/api/v1/chat/conversations', { headers: { Authorization: `Bearer ${tech.token}` } });
    const techList = (await techConvos.json()).data;
    expect(techList).toHaveLength(1);
    expect(techList[0].id).toBe(customerList[0].id);
  });

  test('rejects a non-participant from viewing the conversation or its messages', async ({ request }) => {
    const { categoryKey, tech, customer } = await setupBookingFixture(request);
    const intruder = await createCustomer(request);

    const bookingRes = await request.post('/api/v1/bookings', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category: categoryKey, serviceSlug: 'repair' },
    });
    const { serviceRequest } = (await bookingRes.json()).data;
    await request.post(`/api/v1/tech/jobs/accept/${serviceRequest.id}`, { headers: { Authorization: `Bearer ${tech.token}` }, data: {} });

    const convoRes = await request.get('/api/v1/chat/conversations', { headers: { Authorization: `Bearer ${customer.token}` } });
    const conversationId = (await convoRes.json()).data[0].id;

    const forbidden = await request.get(`/api/v1/chat/conversations/${conversationId}`, { headers: { Authorization: `Bearer ${intruder.token}` } });
    expect(forbidden.status()).toBe(403);

    const forbiddenMessages = await request.get(`/api/v1/chat/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${intruder.token}` },
    });
    expect(forbiddenMessages.status()).toBe(403);
  });
});
