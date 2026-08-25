/**
 * notifications.test.js
 *
 * Tests the multi-channel notification pipeline:
 *   1. In-app: Notification DB write + Socket.IO emit (existing behaviour)
 *   2. FCM Push: firebase-admin sendEachForMulticast called with correct tokens/payload
 *   3. WhatsApp: twilio messages.create called with correct to/body
 *   4. SMS: SMSIndiaHub fetch called with correct number/text
 *   5. Preference opt-out: disabled channel providers are NOT called
 *   6. Missing tokens: push skipped when user has no fcmTokens
 *   7. Escalation broadcast — external channels skipped (no single recipient)
 *
 * All external SDKs (firebase-admin, twilio) and fetch are mocked — no real
 * network calls are made in this suite.
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { testDbUri } from './helpers/testDb.js';

// ── Mock firebase-admin before any import that touches it ─────────────────────
const mockSendEachForMulticast = jest.fn();
jest.unstable_mockModule('firebase-admin', () => ({
  default: {
    apps: [],
    initializeApp: jest.fn(),
    credential: { cert: jest.fn((sa) => sa) },
    messaging: () => ({ sendEachForMulticast: mockSendEachForMulticast }),
  },
}));

// ── Mock twilio ───────────────────────────────────────────────────────────────
const mockMessagesCreate = jest.fn();
jest.unstable_mockModule('twilio', () => ({
  default: jest.fn(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

// ── Mock global fetch (SMSIndiaHub) ───────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Import modules AFTER mocks are set up ────────────────────────────────────
const { emit, listNotifications, markRead, sendAdHocPush, listBroadcasts, awaitPendingDeliveries } =
  await import('../src/modules/notifications/notification.service.js');
const { User } = await import('../src/modules/auth/user.model.js');
const { Notification } = await import('../src/modules/notifications/notification.model.js');
const { NotificationPreference } = await import(
  '../src/modules/notifications/notificationPreference.model.js'
);

// ── DB setup ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Must pass a per-file suffix — a bare testDbUri() resolves to the shared
  // "..._undefined" database, which is exactly the cross-file collision the
  // helper exists to prevent (see helpers/testDb.js).
  const uri = await testDbUri('notifications');
  await mongoose.connect(uri);
});

afterAll(async () => {
  // Drop, not just disconnect — otherwise this file's data survives the run and
  // collides with the next one, as every other suite here already does.
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    Notification.deleteMany({}),
    User.deleteMany({}),
    NotificationPreference.deleteMany({}),
  ]);
  jest.clearAllMocks();
  mockSendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });
  mockMessagesCreate.mockResolvedValue({ sid: 'SM_test' });
  mockFetch.mockResolvedValue({ ok: true, text: async () => 'OK' });
});

async function seedUser({ phone = '9876543210', fcmTokens = [] } = {}) {
  return User.create({
    role: 'customer',
    name: 'Test User',
    phone,
    passwordHash: 'stub',
    status: 'Active',
    fcmTokens,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. In-app (DB)
// ─────────────────────────────────────────────────────────────────────────────
describe('emit() — in-app delivery', () => {
  test('creates a Notification document for a known event', async () => {
    const user = await seedUser();
    const result = await emit('booking.created', { user: user._id, category: 'AC Repair' });
    expect(result).not.toBeNull();
    expect(result.title).toBe('Booking Confirmed');
    const inDb = await Notification.findById(result._id);
    expect(inDb).not.toBeNull();
    expect(inDb.message).toMatch(/AC Repair/);
  });

  test('returns null without throwing for an unknown event', async () => {
    const result = await emit('totally.unknown.event', {});
    expect(result).toBeNull();
  });

  test('marks a notification read', async () => {
    const user = await seedUser();
    const notif = await emit('payment.success', { user: user._id, amount: 499 });
    const updated = await markRead(String(user._id), notif.id);
    expect(updated.read).toBe(true);
  });

  test('listNotifications returns docs for a recipient', async () => {
    const user = await seedUser();
    await emit('service.completed', { user: user._id });
    const { items } = await listNotifications(String(user._id));
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FCM Push
// ─────────────────────────────────────────────────────────────────────────────
describe('emit() — FCM push delivery', () => {
  test('calls sendEachForMulticast with user fcmTokens', async () => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"test"}';
    process.env.NOTIFICATION_PUSH_ENABLED = 'true';
    const user = await seedUser({ fcmTokens: ['token-abc', 'token-xyz'] });
    await emit('booking.created', { user: user._id, category: 'Washing Machine' });
    await new Promise((r) => setTimeout(r, 80));
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);
    const arg = mockSendEachForMulticast.mock.calls[0][0];
    expect(arg.tokens).toEqual(expect.arrayContaining(['token-abc', 'token-xyz']));
    expect(arg.notification.title).toBe('Booking Confirmed');
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
  });

  test('skips push when user has no fcmTokens', async () => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"test"}';
    const user = await seedUser({ fcmTokens: [] });
    await emit('booking.created', { user: user._id, category: 'Fridge' });
    await new Promise((r) => setTimeout(r, 80));
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
  });

  test('prunes stale tokens returned by FCM', async () => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"test"}';
    mockSendEachForMulticast.mockResolvedValueOnce({
      responses: [
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: true },
      ],
    });
    const user = await seedUser({ fcmTokens: ['stale-token', 'valid-token'] });
    await emit('service.completed', { user: user._id });
    await new Promise((r) => setTimeout(r, 150));
    const refreshed = await User.findById(user._id).lean();
    expect(refreshed.fcmTokens).not.toContain('stale-token');
    expect(refreshed.fcmTokens).toContain('valid-token');
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
  });

  test('skips push when NOTIFICATION_PUSH_ENABLED=false', async () => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"test"}';
    process.env.NOTIFICATION_PUSH_ENABLED = 'false';
    const user = await seedUser({ fcmTokens: ['token-abc'] });
    await emit('booking.created', { user: user._id, category: 'AC' });
    await new Promise((r) => setTimeout(r, 80));
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    delete process.env.NOTIFICATION_PUSH_ENABLED;
  });

  test('skips push when user preference push=false', async () => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"test"}';
    process.env.NOTIFICATION_PUSH_ENABLED = 'true';
    const user = await seedUser({ fcmTokens: ['token-abc'] });
    await NotificationPreference.create({ user: user._id, push: false });
    await emit('booking.created', { user: user._id, category: 'AC' });
    await new Promise((r) => setTimeout(r, 80));
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    delete process.env.NOTIFICATION_PUSH_ENABLED;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. WhatsApp (Twilio)
// ─────────────────────────────────────────────────────────────────────────────
describe('emit() — WhatsApp delivery', () => {
  test('calls twilio messages.create with whatsapp: prefix and correct body', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'authtest';
    process.env.NOTIFICATION_WHATSAPP_ENABLED = 'true';
    const user = await seedUser({ phone: '9876543210' });
    await emit('technician.assigned', { user: user._id, technicianName: 'Ravi Kumar' });
    await new Promise((r) => setTimeout(r, 80));
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    const arg = mockMessagesCreate.mock.calls[0][0];
    expect(arg.to).toMatch(/^whatsapp:\+91/);
    expect(arg.body).toMatch(/Ravi Kumar/);
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  test('skips WhatsApp when NOTIFICATION_WHATSAPP_ENABLED=false', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'authtest';
    process.env.NOTIFICATION_WHATSAPP_ENABLED = 'false';
    const user = await seedUser({ phone: '9876543210' });
    await emit('technician.assigned', { user: user._id, technicianName: 'Ravi' });
    await new Promise((r) => setTimeout(r, 80));
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.NOTIFICATION_WHATSAPP_ENABLED;
  });

  test('skips WhatsApp when user preference whatsapp=false', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'authtest';
    process.env.NOTIFICATION_WHATSAPP_ENABLED = 'true';
    const user = await seedUser({ phone: '9876543210' });
    await NotificationPreference.create({ user: user._id, whatsapp: false });
    await emit('payment.success', { user: user._id, amount: 299 });
    await new Promise((r) => setTimeout(r, 80));
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.NOTIFICATION_WHATSAPP_ENABLED;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMS (SMSIndiaHub)
// ─────────────────────────────────────────────────────────────────────────────
describe('emit() — SMS delivery', () => {
  const smsEnv = () => {
    process.env.SMSINDIAHUB_USERNAME = 'testuser';
    process.env.SMSINDIAHUB_PASSWORD = 'testpass';
    process.env.SMSINDIAHUB_SENDER_ID = 'NIGAM';
    process.env.SMSINDIAHUB_ENTITY_ID = 'ENT001';
    process.env.SMSINDIAHUB_DLT_TEMPLATE_ID = 'TPL001';
    process.env.NOTIFICATION_SMS_ENABLED = 'true';
  };
  const clearSmsEnv = () => {
    delete process.env.SMSINDIAHUB_USERNAME;
    delete process.env.SMSINDIAHUB_PASSWORD;
    delete process.env.SMSINDIAHUB_SENDER_ID;
    delete process.env.SMSINDIAHUB_ENTITY_ID;
    delete process.env.SMSINDIAHUB_DLT_TEMPLATE_ID;
    delete process.env.NOTIFICATION_SMS_ENABLED;
  };

  test('calls SMSIndiaHub fetch with correct phone number', async () => {
    smsEnv();
    const user = await seedUser({ phone: '9876543210' });
    await emit('service.completed', { user: user._id });
    await new Promise((r) => setTimeout(r, 80));
    const smsCalls = mockFetch.mock.calls.filter((args) => String(args[0]).includes('smsindiahub'));
    expect(smsCalls.length).toBe(1);
    expect(smsCalls[0][0]).toMatch(/9876543210/);
    clearSmsEnv();
  });

  test('skips SMS when NOTIFICATION_SMS_ENABLED=false', async () => {
    smsEnv();
    process.env.NOTIFICATION_SMS_ENABLED = 'false';
    const user = await seedUser({ phone: '9876543210' });
    await emit('payment.success', { user: user._id, amount: 399 });
    await new Promise((r) => setTimeout(r, 80));
    const smsCalls = mockFetch.mock.calls.filter((args) => String(args[0]).includes('smsindiahub'));
    expect(smsCalls.length).toBe(0);
    clearSmsEnv();
  });

  test('skips SMS when user preference sms=false', async () => {
    smsEnv();
    const user = await seedUser({ phone: '9876543210' });
    await NotificationPreference.create({ user: user._id, sms: false });
    await emit('claim.approved', { user: user._id, item: 'Compressor' });
    await new Promise((r) => setTimeout(r, 80));
    const smsCalls = mockFetch.mock.calls.filter((args) => String(args[0]).includes('smsindiahub'));
    expect(smsCalls.length).toBe(0);
    clearSmsEnv();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Broadcast (escalation) — external channels skipped
// ─────────────────────────────────────────────────────────────────────────────
describe('emit() — broadcast escalation event', () => {
  test('saves a broadcast notification and skips all external channels', async () => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'authtest';
    const result = await emit('escalation.raised', { reason: 'Urgent equipment failure' });
    await new Promise((r) => setTimeout(r, 80));
    expect(result).not.toBeNull();
    expect(result.broadcastRole).toBe('All');
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Broadcast push fan-out — the super-admin console's composer
//
// Regression guard: sendAdHocPush({ broadcastRole }) used to write a row, emit
// a socket event, report success, and send zero pushes — deliverExternal()
// returned immediately when there was no single recipient to resolve.
// ─────────────────────────────────────────────────────────────────────────────

/** Distinct phone per call — User has a unique { phone, role } index. */
let phoneSeq = 0;
async function seedRoleUser(role, { tokens = [], phone } = {}) {
  phoneSeq += 1;
  return User.create({
    role,
    name: `${role}-${phoneSeq}`,
    phone: phone || `90000${String(phoneSeq).padStart(5, '0')}`,
    passwordHash: 'stub',
    status: 'Active',
    fcmTokens: tokens,
  });
}

/** Every token string handed to FCM across all calls this test made. */
function tokensSentToFcm() {
  return mockSendEachForMulticast.mock.calls.flatMap((c) => c[0].tokens);
}

describe('sendAdHocPush() — broadcast fan-out', () => {
  beforeEach(() => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"test"}';
    process.env.NOTIFICATION_PUSH_ENABLED = 'true';
    phoneSeq = 0;
  });

  afterEach(() => {
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    delete process.env.NOTIFICATION_PUSH_ENABLED;
  });

  test('a role broadcast pushes to that role only', async () => {
    await seedRoleUser('technician', { tokens: ['tech-1'] });
    await seedRoleUser('technician', { tokens: ['tech-2'] });
    await seedRoleUser('customer', { tokens: ['cust-1'] });
    await seedRoleUser('brand_admin', { tokens: ['brand-1'] });

    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Payout', body: 'Wednesdays', type: 'promo' });
    await awaitPendingDeliveries();

    const sent = tokensSentToFcm();
    expect(sent.sort()).toEqual(['tech-1', 'tech-2']);
    expect(sent).not.toContain('cust-1');
    expect(sent).not.toContain('brand-1');
  });

  test('Customers and Brands each select their own role', async () => {
    await seedRoleUser('customer', { tokens: ['cust-1'] });
    await seedRoleUser('brand_admin', { tokens: ['brand-1'] });

    await sendAdHocPush({ broadcastRole: 'Customers', title: 'Offer', body: '10% off', type: 'promo' });
    await awaitPendingDeliveries();
    expect(tokensSentToFcm()).toEqual(['cust-1']);

    jest.clearAllMocks();
    mockSendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });

    await sendAdHocPush({ broadcastRole: 'Brands', title: 'Portal', body: 'New report', type: 'promo' });
    await awaitPendingDeliveries();
    expect(tokensSentToFcm()).toEqual(['brand-1']);
  });

  test('"All" reaches every role', async () => {
    await seedRoleUser('technician', { tokens: ['tech-1'] });
    await seedRoleUser('customer', { tokens: ['cust-1'] });
    await seedRoleUser('brand_admin', { tokens: ['brand-1'] });

    await sendAdHocPush({ broadcastRole: 'All', title: 'Maintenance', body: '2 AM', type: 'promo' });
    await awaitPendingDeliveries();

    expect(tokensSentToFcm().sort()).toEqual(['brand-1', 'cust-1', 'tech-1']);
  });

  test('carries the notification title/body and its id in the data payload', async () => {
    await seedRoleUser('technician', { tokens: ['tech-1'] });

    const notif = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Heads up', body: 'Read this', type: 'promo' });
    await awaitPendingDeliveries();

    const arg = mockSendEachForMulticast.mock.calls[0][0];
    expect(arg.notification).toEqual({ title: 'Heads up', body: 'Read this' });
    expect(arg.data.notificationId).toBe(String(notif._id));
    expect(arg.data.broadcastRole).toBe('Technicians');
  });

  test('splits into 500-token batches — FCM rejects more in one call', async () => {
    // 60 technicians x 10 devices = 600 tokens => 500 + 100.
    await Promise.all(
      Array.from({ length: 60 }, (_, u) =>
        seedRoleUser('technician', { tokens: Array.from({ length: 10 }, (_, t) => `t${u}-d${t}`) }),
      ),
    );

    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Bulk', body: 'Fan out', type: 'promo' });
    await awaitPendingDeliveries();

    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2);
    const sizes = mockSendEachForMulticast.mock.calls.map((c) => c[0].tokens.length);
    expect(sizes).toEqual([500, 100]);
    expect(new Set(tokensSentToFcm()).size).toBe(600);
    expect(sizes.every((n) => n <= 500)).toBe(true);
  });

  test('skips users who opted out of push', async () => {
    const optedIn = await seedRoleUser('technician', { tokens: ['in-1'] });
    const optedOut = await seedRoleUser('technician', { tokens: ['out-1'] });
    await NotificationPreference.create({ user: optedOut._id, push: false });

    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Notice', body: 'Body', type: 'promo' });
    await awaitPendingDeliveries();

    const sent = tokensSentToFcm();
    expect(sent).toEqual(['in-1']);
    expect(sent).not.toContain('out-1');
    expect(optedIn).toBeTruthy();
  });

  test('a promo broadcast respects the promo-specific opt-out', async () => {
    await seedRoleUser('customer', { tokens: ['keep-1'] });
    const noPromo = await seedRoleUser('customer', { tokens: ['nopromo-1'] });
    await NotificationPreference.create({ user: noPromo._id, whatsAppPromo: false, emailPromo: false });

    await sendAdHocPush({ broadcastRole: 'Customers', title: 'Sale', body: 'Today', type: 'promo' });
    await awaitPendingDeliveries();

    expect(tokensSentToFcm()).toEqual(['keep-1']);
  });

  test('sends nothing when NOTIFICATION_PUSH_ENABLED=false', async () => {
    process.env.NOTIFICATION_PUSH_ENABLED = 'false';
    await seedRoleUser('technician', { tokens: ['tech-1'] });

    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Off', body: 'Body', type: 'promo' });
    await awaitPendingDeliveries();

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  test('users without device tokens are not sent to', async () => {
    await seedRoleUser('technician', { tokens: [] });

    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Nobody', body: 'Body', type: 'promo' });
    await awaitPendingDeliveries();

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  test('prunes stale tokens across the whole audience in one pass', async () => {
    const a = await seedRoleUser('technician', { tokens: ['good-1', 'dead-1'] });
    const b = await seedRoleUser('technician', { tokens: ['dead-2'] });

    mockSendEachForMulticast.mockImplementation(async ({ tokens }) => ({
      responses: tokens.map((t) => (t.startsWith('dead')
        ? { success: false, error: { code: 'messaging/registration-token-not-registered' } }
        : { success: true })),
    }));

    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Prune', body: 'Body', type: 'promo' });
    await awaitPendingDeliveries();

    const [afterA, afterB] = await Promise.all([User.findById(a._id).lean(), User.findById(b._id).lean()]);
    expect(afterA.fcmTokens).toEqual(['good-1']);
    expect(afterB.fcmTokens).toEqual([]);
  });

  test('a personal ad-hoc push is unaffected by the broadcast path', async () => {
    const user = await seedRoleUser('customer', { tokens: ['solo-1'] });

    await sendAdHocPush({ recipientId: String(user._id), title: 'Just you', body: 'Body', type: 'tech' });
    await awaitPendingDeliveries();

    expect(tokensSentToFcm()).toEqual(['solo-1']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast history — the super-admin console's composer reads this back
// ─────────────────────────────────────────────────────────────────────────────
describe('listBroadcasts', () => {
  test('returns role-wide broadcasts newest-first and excludes personal notifications', async () => {
    const user = await seedUser();

    await sendAdHocPush({ recipientId: String(user._id), title: 'Just for you', body: 'personal', type: 'tech' });
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'New payout cycle', body: 'Wednesdays', type: 'promo' });
    await sendAdHocPush({ broadcastRole: 'All', title: 'App update tonight', body: '2 AM', type: 'promo' });

    const { items, meta } = await listBroadcasts({});
    expect(items).toHaveLength(2);
    // A personal notification is one user's inbox, not broadcast history.
    expect(items.every((i) => i.broadcastRole !== null)).toBe(true);
    expect(items[0].title).toBe('App update tonight');
    expect(meta.total).toBe(2);
  });

  test('returns an empty list when nothing has been broadcast', async () => {
    const { items } = await listBroadcasts({});
    expect(items).toEqual([]);
  });
});
