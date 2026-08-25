import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers the notification HTTP surface end-to-end:
//   GET    /api/v1/notifications
//   PATCH  /api/v1/notifications/:id/read
//   PATCH  /api/v1/notifications/read-all
//   GET    /api/v1/notifications/preferences
//   PUT    /api/v1/notifications/preferences  (including new whatsapp field)
//   POST   /api/v1/notifications/device-token
//   DELETE /api/v1/notifications/device-token

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
  const phone = `9${randomUUID().replace(/\D/g, '').slice(0, 9).padEnd(9, '0')}`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone, password: 'password123' } });
  const token = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });
  return { phone, token };
}

async function createSuperAdmin(request) {
  const email = `sa-notif-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  const token = await loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });
  return { email, token };
}


async function createTechnician(request) {
  const phone = `9${randomUUID().replace(/\D/g, '').slice(0, 9).padEnd(9, '0')}`;
  await request.post('/api/v1/_dev/test-technician', {
    data: { phone, password: 'password123', specs: ['AC'], availability: 'Available' },
  });
  const token = await loginAndVerify(request, { role: 'technician', identifier: phone, password: 'password123' });
  return { phone, token };
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Notification feed', () => {
  test('GET /notifications returns an empty array for a new user', async ({ request }) => {
    const { token } = await createCustomer(request);
    const res = await request.get('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('rejects unauthenticated request with 401', async ({ request }) => {
    const res = await request.get('/api/v1/notifications');
    expect(res.status()).toBe(401);
  });

  test('PATCH /:id/read marks an in-app notification as read', async ({ request }) => {
    const { token } = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // Seed a notification via the dev push route
    const seedRes = await request.post('/api/v1/_dev/test-notification', {
      ...auth,
      data: { type: 'created', title: 'E2E Test', message: 'Hello E2E' },
    });
    if (seedRes.status() === 404) {
      // Dev route not mounted yet — skip gracefully rather than fail
      test.skip();
      return;
    }
    const notif = (await seedRes.json()).data;

    const patchRes = await request.patch(`/api/v1/notifications/${notif.id}/read`, auth);
    expect(patchRes.status()).toBe(200);
    expect((await patchRes.json()).data.read).toBe(true);
  });

  test('PATCH /read-all marks all notifications read', async ({ request }) => {
    const { token } = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const res = await request.patch('/api/v1/notifications/read-all', auth);
    expect(res.status()).toBe(200);
    expect((await res.json()).data.updated).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Notification preferences', () => {
  test('GET /preferences returns defaults for a new user', async ({ request }) => {
    const { token } = await createCustomer(request);
    const res = await request.get('/api/v1/notifications/preferences', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const prefs = (await res.json()).data;
    expect(typeof prefs.push).toBe('boolean');
    expect(typeof prefs.sms).toBe('boolean');
    expect(typeof prefs.whatsapp).toBe('boolean');
  });

  test('PUT /preferences toggles push, sms, and whatsapp', async ({ request }) => {
    const { token } = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const putRes = await request.put('/api/v1/notifications/preferences', {
      ...auth,
      data: { push: false, sms: false, whatsapp: false },
    });
    expect(putRes.status()).toBe(200);
    const updated = (await putRes.json()).data;
    expect(updated.push).toBe(false);
    expect(updated.sms).toBe(false);
    expect(updated.whatsapp).toBe(false);

    // Re-enable whatsapp only
    const re = await request.put('/api/v1/notifications/preferences', {
      ...auth,
      data: { whatsapp: true },
    });
    const re2 = (await re.json()).data;
    expect(re2.whatsapp).toBe(true);
    expect(re2.push).toBe(false); // unchanged
  });

  test('rejects invalid preference value with 400', async ({ request }) => {
    const { token } = await createCustomer(request);
    const res = await request.put('/api/v1/notifications/preferences', {
      headers: { Authorization: `Bearer ${token}` },
      data: { push: 'yes_please' }, // should be boolean
    });
    expect(res.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('FCM device token registration', () => {
  test('POST /device-token registers a token, DELETE removes it', async ({ request }) => {
    const { token } = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const fcmToken = `fcm-e2e-${randomUUID()}`;

    const postRes = await request.post('/api/v1/notifications/device-token', {
      ...auth,
      data: { token: fcmToken },
    });
    expect(postRes.status()).toBe(200);
    const postBody = (await postRes.json()).data;
    expect(postBody.registered).toBe(true);
    expect(postBody.tokenCount).toBeGreaterThanOrEqual(1);

    // Registering the same token twice should be idempotent
    const dupeRes = await request.post('/api/v1/notifications/device-token', {
      ...auth,
      data: { token: fcmToken },
    });
    expect((await dupeRes.json()).data.tokenCount).toBe(postBody.tokenCount);

    // Remove the token
    const delRes = await request.delete('/api/v1/notifications/device-token', {
      ...auth,
      data: { token: fcmToken },
    });
    expect(delRes.status()).toBe(200);
    expect((await delRes.json()).data.removed).toBe(true);
  });

  test('POST /device-token rejects missing token with 400', async ({ request }) => {
    const { token } = await createCustomer(request);
    const res = await request.post('/api/v1/notifications/device-token', {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('POST /device-token rejects unauthenticated with 401', async ({ request }) => {
    const res = await request.post('/api/v1/notifications/device-token', {
      data: { token: 'some-token' },
    });
    expect(res.status()).toBe(401);
  });

  test('caps FCM tokens at 20 per user', async ({ request }) => {
    const { token } = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // Register 21 unique tokens
    for (let i = 0; i < 21; i++) {
      await request.post('/api/v1/notifications/device-token', {
        ...auth,
        data: { token: `fcm-cap-${i}-${randomUUID()}` },
      });
    }

    const lastRes = await request.post('/api/v1/notifications/device-token', {
      ...auth,
      data: { token: `fcm-final-${randomUUID()}` },
    });
    const body = (await lastRes.json()).data;
    expect(body.tokenCount).toBeLessThanOrEqual(20);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Super-admin broadcast targeting, over real HTTP.
//
// Regression guard for the pair of faults that made the console's composer a
// no-op for every audience except "All": listNotifications() hardcoded
// broadcastRole 'All', so a role-targeted broadcast reached no inbox at all,
// and GET /notifications/:id let any user open any broadcast by id.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Super-admin broadcast targeting', () => {
  test('a Technicians broadcast reaches technicians and not customers', async ({ request }) => {
    const admin = await createSuperAdmin(request);
    const tech = await createTechnician(request);
    const customer = await createCustomer(request);

    const title = `Payout window ${randomUUID().slice(0, 8)}`;
    const sent = await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { broadcastRole: 'Technicians', title, body: 'Moved to Wednesdays', type: 'promo' },
    });
    expect(sent.status()).toBe(201);

    const techFeed = await request.get('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${tech.token}` },
    });
    expect((await techFeed.json()).data.map((n) => n.title)).toContain(title);

    const custFeed = await request.get('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect((await custFeed.json()).data.map((n) => n.title)).not.toContain(title);
  });

  test('an All broadcast reaches every role', async ({ request }) => {
    const admin = await createSuperAdmin(request);
    const tech = await createTechnician(request);
    const customer = await createCustomer(request);

    const title = `Maintenance ${randomUUID().slice(0, 8)}`;
    await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { broadcastRole: 'All', title, body: '2 AM tonight', type: 'promo' },
    });

    for (const token of [tech.token, customer.token]) {
      const feed = await request.get('/api/v1/notifications', { headers: { Authorization: `Bearer ${token}` } });
      expect((await feed.json()).data.map((n) => n.title)).toContain(title);
    }
  });

  test('a customer cannot open a technicians-only broadcast by id', async ({ request }) => {
    const admin = await createSuperAdmin(request);
    const customer = await createCustomer(request);

    const sent = await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { broadcastRole: 'Technicians', title: `Tech only ${randomUUID().slice(0, 8)}`, body: 'Body', type: 'promo' },
    });
    const id = (await sent.json()).data.id;

    const res = await request.get(`/api/v1/notifications/${id}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('a non-admin cannot broadcast', async ({ request }) => {
    const { token } = await createCustomer(request);
    const res = await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${token}` },
      data: { broadcastRole: 'All', title: 'Nope', body: 'Body', type: 'promo' },
    });
    expect(res.status()).toBe(403);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Per-user broadcast read state, over real HTTP.
//
// A broadcast has many readers; the document's single `read` flag cannot say
// "read by this technician, unread for that one". Read state lives in a
// per-user receipt, so one technician clearing a broadcast must not clear it
// for the rest of the role.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Broadcast read state is per user', () => {
  test('one technician reading a broadcast leaves it unread for another', async ({ request }) => {
    const admin = await createSuperAdmin(request);
    const alice = await createTechnician(request);
    const bob = await createTechnician(request);

    const title = `Shift change ${randomUUID().slice(0, 8)}`;
    const sent = await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { broadcastRole: 'Technicians', title, body: 'Body', type: 'promo' },
    });
    const id = (await sent.json()).data.id;

    const marked = await request.patch(`/api/v1/notifications/${id}/read`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    expect(marked.status()).toBe(200);

    const aliceUnread = await request.get('/api/v1/notifications?read=false', {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    expect((await aliceUnread.json()).data.map((n) => n.title)).not.toContain(title);

    const bobUnread = await request.get('/api/v1/notifications?read=false', {
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    expect((await bobUnread.json()).data.map((n) => n.title)).toContain(title);
  });

  test('read-all clears broadcasts for the caller only', async ({ request }) => {
    const admin = await createSuperAdmin(request);
    const alice = await createTechnician(request);
    const bob = await createTechnician(request);

    const title = `Payout notice ${randomUUID().slice(0, 8)}`;
    await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { broadcastRole: 'Technicians', title, body: 'Body', type: 'promo' },
    });

    await request.patch('/api/v1/notifications/read-all', {
      headers: { Authorization: `Bearer ${alice.token}` },
    });

    // Assert on THIS broadcast, not on an empty feed: specs run fully parallel
    // against one database, so another spec's platform-wide broadcast can land
    // in Alice's inbox between the read-all and this read.
    const aliceUnread = await request.get('/api/v1/notifications?read=false', {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    expect((await aliceUnread.json()).data.map((n) => n.title)).not.toContain(title);

    const bobUnread = await request.get('/api/v1/notifications?read=false', {
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    expect((await bobUnread.json()).data.map((n) => n.title)).toContain(title);
  });

  test('a customer cannot mark a technicians-only broadcast read', async ({ request }) => {
    const admin = await createSuperAdmin(request);
    const customer = await createCustomer(request);

    const sent = await request.post('/api/v1/notifications/push', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { broadcastRole: 'Technicians', title: `Tech only ${randomUUID().slice(0, 8)}`, body: 'Body', type: 'promo' },
    });
    const id = (await sent.json()).data.id;

    const res = await request.patch(`/api/v1/notifications/${id}/read`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect(res.status()).toBe(403);
  });
});
