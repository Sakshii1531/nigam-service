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
const { emit, listNotifications, markRead, sendAdHocPush, listBroadcasts, awaitPendingDeliveries, getNotification, markAllRead, getPushStats } =
  await import('../src/modules/notifications/notification.service.js');
const { User } = await import('../src/modules/auth/user.model.js');
const { Notification } = await import('../src/modules/notifications/notification.model.js');
const { NotificationPreference } = await import(
  '../src/modules/notifications/notificationPreference.model.js'
);
const { NotificationReceipt } = await import(
  '../src/modules/notifications/notificationReceipt.model.js'
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
    NotificationReceipt.deleteMany({}),
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
    const updated = await markRead({ id: String(user._id), role: 'customer' }, notif.id);
    expect(updated.read).toBe(true);
  });

  test('listNotifications returns docs for a recipient', async () => {
    const user = await seedUser();
    await emit('service.completed', { user: user._id });
    const { items } = await listNotifications({ id: String(user._id), role: 'customer' });
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
// 6b. Channel selection — an in-app announcement that does not buzz phones
// ─────────────────────────────────────────────────────────────────────────────
describe('sendAdHocPush() — channel selection', () => {
  beforeEach(() => {
    process.env.FCM_SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"test"}';
    process.env.NOTIFICATION_PUSH_ENABLED = 'true';
    phoneSeq = 0;
  });
  afterEach(() => {
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    delete process.env.NOTIFICATION_PUSH_ENABLED;
  });

  test('channels: ["inapp"] still records the broadcast but sends no device push', async () => {
    await seedRoleUser('technician', { tokens: ['tech-1'] });

    const notif = await sendAdHocPush({
      broadcastRole: 'Technicians', title: 'Quiet notice', body: 'Body', type: 'promo', channels: ['inapp'],
    });
    await awaitPendingDeliveries();

    expect(notif.title).toBe('Quiet notice');
    expect(await Notification.countDocuments({ title: 'Quiet notice' })).toBe(1);
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  test('an in-app-only broadcast still reaches the role\'s inbox', async () => {
    const tech = { id: String((await seedRoleUser('technician'))._id), role: 'technician' };
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Quiet notice', body: 'Body', type: 'promo', channels: ['inapp'] });

    const { items } = await listNotifications(tech);
    expect(items.map((i) => i.title)).toContain('Quiet notice');
  });

  test('channels: ["inapp","push"] fans out to devices', async () => {
    await seedRoleUser('technician', { tokens: ['tech-1'] });
    await sendAdHocPush({
      broadcastRole: 'Technicians', title: 'Loud notice', body: 'Body', type: 'promo', channels: ['inapp', 'push'],
    });
    await awaitPendingDeliveries();
    expect(tokensSentToFcm()).toEqual(['tech-1']);
  });

  test('omitting channels keeps the previous behaviour — push is sent', async () => {
    await seedRoleUser('technician', { tokens: ['tech-1'] });
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Default', body: 'Body', type: 'promo' });
    await awaitPendingDeliveries();
    expect(tokensSentToFcm()).toEqual(['tech-1']);
  });

  test('an in-app-only personal dispatch sends no push either', async () => {
    const user = await seedRoleUser('customer', { tokens: ['cust-1'] });
    await sendAdHocPush({
      recipientId: String(user._id), title: 'Quiet personal', body: 'Body', type: 'tech', channels: ['inapp'],
    });
    await awaitPendingDeliveries();
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Broadcast inbox visibility + isolation
//
// Regression guard: listNotifications() hardcoded `broadcastRole: 'All'`, so a
// broadcast to Technicians/Brands/Customers never appeared in ANY inbox — and
// getNotification() let any user open any broadcast by id.
// ─────────────────────────────────────────────────────────────────────────────
describe('broadcast inbox visibility', () => {
  test('a role broadcast lands in that role\'s inbox', async () => {
    const tech = await seedRoleUser('technician');
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Payout moved', body: 'Wednesdays', type: 'promo' });

    const { items } = await listNotifications({ id: String(tech._id), role: 'technician' });
    expect(items.map((i) => i.title)).toContain('Payout moved');
  });

  test('and stays out of every other role\'s inbox', async () => {
    const customer = await seedRoleUser('customer');
    const brand = await seedRoleUser('brand_admin');
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Tech only', body: 'Body', type: 'promo' });

    const cust = await listNotifications({ id: String(customer._id), role: 'customer' });
    const brnd = await listNotifications({ id: String(brand._id), role: 'brand_admin' });
    expect(cust.items).toHaveLength(0);
    expect(brnd.items).toHaveLength(0);
  });

  test('an "All" broadcast reaches every role, super_admin included', async () => {
    const tech = await seedRoleUser('technician');
    const customer = await seedRoleUser('customer');
    const brand = await seedRoleUser('brand_admin');
    const admin = await seedRoleUser('super_admin');
    await sendAdHocPush({ broadcastRole: 'All', title: 'Maintenance tonight', body: '2 AM', type: 'promo' });

    for (const [u, role] of [[tech, 'technician'], [customer, 'customer'], [brand, 'brand_admin'], [admin, 'super_admin']]) {
      const { items } = await listNotifications({ id: String(u._id), role });
      expect(items.map((i) => i.title)).toContain('Maintenance tonight');
    }
  });

  test('a super_admin does not receive role-targeted broadcasts', async () => {
    const admin = await seedRoleUser('super_admin');
    await sendAdHocPush({ broadcastRole: 'Customers', title: 'Customer promo', body: 'Body', type: 'promo' });

    const { items } = await listNotifications({ id: String(admin._id), role: 'super_admin' });
    expect(items).toHaveLength(0);
  });

  test('personal notifications still reach their recipient alongside broadcasts', async () => {
    const tech = await seedRoleUser('technician');
    await sendAdHocPush({ recipientId: String(tech._id), title: 'Just you', body: 'Body', type: 'tech' });
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'All techs', body: 'Body', type: 'promo' });
    await sendAdHocPush({ broadcastRole: 'Customers', title: 'Not for you', body: 'Body', type: 'promo' });

    const { items } = await listNotifications({ id: String(tech._id), role: 'technician' });
    const titles = items.map((i) => i.title);
    expect(titles).toEqual(expect.arrayContaining(['Just you', 'All techs']));
    expect(titles).not.toContain('Not for you');
  });

  test('getNotification refuses a broadcast aimed at another role', async () => {
    const customer = await seedRoleUser('customer');
    const notif = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Tech only', body: 'Body', type: 'promo' });

    await expect(
      getNotification({ id: String(customer._id), role: 'customer' }, String(notif._id)),
    ).rejects.toThrow(/Not authorized/);
  });

  test('getNotification allows a broadcast aimed at the caller\'s role', async () => {
    const tech = await seedRoleUser('technician');
    const notif = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Tech only', body: 'Body', type: 'promo' });

    const found = await getNotification({ id: String(tech._id), role: 'technician' }, String(notif._id));
    expect(found.title).toBe('Tech only');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Per-user broadcast read state
//
// A broadcast has many readers, so the document's single `read` flag cannot say
// "read by this technician, unread for that one". Read state for a broadcast
// lives in a NotificationReceipt row instead.
// ─────────────────────────────────────────────────────────────────────────────
describe('per-user broadcast read state', () => {
  async function twoTechs() {
    return [
      { id: String((await seedRoleUser('technician'))._id), role: 'technician' },
      { id: String((await seedRoleUser('technician'))._id), role: 'technician' },
    ];
  }

  test('one user reading a broadcast leaves it unread for everyone else', async () => {
    const [alice, bob] = await twoTechs();
    const notif = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Shift change', body: 'Body', type: 'promo' });

    await markRead(alice, String(notif._id));

    const a = await listNotifications(alice);
    const b = await listNotifications(bob);
    expect(a.items.find((i) => i.title === 'Shift change').read).toBe(true);
    expect(b.items.find((i) => i.title === 'Shift change').read).toBe(false);
  });

  test('read=false excludes a broadcast this user has read, but not others', async () => {
    const [alice, bob] = await twoTechs();
    const notif = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Shift change', body: 'Body', type: 'promo' });
    await markRead(alice, String(notif._id));

    const aUnread = await listNotifications(alice, { read: false });
    const bUnread = await listNotifications(bob, { read: false });
    expect(aUnread.items).toHaveLength(0);
    expect(bUnread.items.map((i) => i.title)).toEqual(['Shift change']);
  });

  test('read=true returns it for the reader only', async () => {
    const [alice, bob] = await twoTechs();
    const notif = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Shift change', body: 'Body', type: 'promo' });
    await markRead(alice, String(notif._id));

    expect((await listNotifications(alice, { read: true })).items.map((i) => i.title)).toEqual(['Shift change']);
    expect((await listNotifications(bob, { read: true })).items).toHaveLength(0);
  });

  test('meta.total reflects the per-user filter, not the raw document count', async () => {
    const [alice, bob] = await twoTechs();
    const n1 = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'One', body: 'Body', type: 'promo' });
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Two', body: 'Body', type: 'promo' });
    await markRead(alice, String(n1._id));

    expect((await listNotifications(alice, { read: false })).meta.total).toBe(1);
    expect((await listNotifications(bob, { read: false })).meta.total).toBe(2);
  });

  test('marking the same broadcast read twice is idempotent', async () => {
    const [alice] = await twoTechs();
    const notif = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Twice', body: 'Body', type: 'promo' });

    await markRead(alice, String(notif._id));
    await expect(markRead(alice, String(notif._id))).resolves.toBeTruthy();
    expect(await NotificationReceipt.countDocuments({ user: alice.id, notification: notif._id })).toBe(1);
  });

  test('markRead refuses a broadcast aimed at another role', async () => {
    const customer = { id: String((await seedRoleUser('customer'))._id), role: 'customer' };
    const notif = await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Tech only', body: 'Body', type: 'promo' });

    await expect(markRead(customer, String(notif._id))).rejects.toThrow(/Not authorized/);
    expect(await NotificationReceipt.countDocuments({})).toBe(0);
  });

  test('markAllRead clears broadcasts as well as personal notifications', async () => {
    const [alice, bob] = await twoTechs();
    await sendAdHocPush({ recipientId: alice.id, title: 'Personal', body: 'Body', type: 'tech' });
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Broadcast', body: 'Body', type: 'promo' });
    await sendAdHocPush({ broadcastRole: 'All', title: 'Platform', body: 'Body', type: 'promo' });

    await markAllRead(alice);

    expect((await listNotifications(alice, { read: false })).items).toHaveLength(0);
    // ...and did not read anything on anyone else's behalf.
    expect((await listNotifications(bob, { read: false })).items.map((i) => i.title).sort())
      .toEqual(['Broadcast', 'Platform']);
  });

  test('markAllRead is safe to run twice (no duplicate receipts)', async () => {
    const [alice] = await twoTechs();
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Once', body: 'Body', type: 'promo' });

    await markAllRead(alice);
    await expect(markAllRead(alice)).resolves.not.toThrow();
    expect(await NotificationReceipt.countDocuments({ user: alice.id })).toBe(1);
  });

  test('a personal notification still uses its own read flag', async () => {
    const [alice] = await twoTechs();
    const notif = await sendAdHocPush({ recipientId: alice.id, title: 'Mine', body: 'Body', type: 'tech' });

    await markRead(alice, String(notif._id));

    expect(await Notification.findById(notif._id).then((n) => n.read)).toBe(true);
    expect(await NotificationReceipt.countDocuments({})).toBe(0);
  });

  test('list items expose `id` — the toJSON plugin does not run on aggregation output', async () => {
    const [alice] = await twoTechs();
    await sendAdHocPush({ broadcastRole: 'Technicians', title: 'Shape', body: 'Body', type: 'promo' });

    const { items } = await listNotifications(alice);
    expect(items[0].id).toBeDefined();
    expect(items[0]._id).toBeUndefined();
    expect(items[0].receipt).toBeUndefined();
    expect(items[0].title).toBe('Shape');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Reach preview — what the composer promises must match what it will do
// ─────────────────────────────────────────────────────────────────────────────
describe('getPushStats', () => {
  test('scopes device counts to the targeted audience', async () => {
    await seedRoleUser('technician', { tokens: ['t1', 't2'] });
    await seedRoleUser('technician', { tokens: ['t3'] });
    await seedRoleUser('customer', { tokens: ['c1'] });

    const techs = await getPushStats({ broadcastRole: 'Technicians' });
    expect(techs.deviceHolders).toBe(2);
    expect(techs.activeDevices).toBe(3);

    const customers = await getPushStats({ broadcastRole: 'Customers' });
    expect(customers.deviceHolders).toBe(1);
    expect(customers.activeDevices).toBe(1);
  });

  test('"All" counts every role', async () => {
    await seedRoleUser('technician', { tokens: ['t1'] });
    await seedRoleUser('customer', { tokens: ['c1'] });
    const all = await getPushStats({ broadcastRole: 'All' });
    expect(all.deviceHolders).toBe(2);
    expect(all.activeDevices).toBe(2);
  });

  test('excludes opted-out users, so reach matches what the fan-out will send', async () => {
    await seedRoleUser('technician', { tokens: ['keep'] });
    const out = await seedRoleUser('technician', { tokens: ['skip-1', 'skip-2'] });
    await NotificationPreference.create({ user: out._id, push: false });

    const stats = await getPushStats({ broadcastRole: 'Technicians' });
    expect(stats.deviceHolders).toBe(1);
    expect(stats.activeDevices).toBe(1);
  });

  test('reports audience size separately from how many can be reached', async () => {
    await seedRoleUser('technician', { tokens: ['t1'] });
    await seedRoleUser('technician'); // no device
    await seedRoleUser('technician'); // no device

    const stats = await getPushStats({ broadcastRole: 'Technicians' });
    expect(stats.audience).toBe(3);
    expect(stats.deviceHolders).toBe(1);
  });

  test('rejects an unknown audience rather than silently reporting everyone', async () => {
    await expect(getPushStats({ broadcastRole: 'Wizards' })).rejects.toThrow(/Unknown broadcast audience/);
  });

  test('no audience given still reports platform-wide totals', async () => {
    await seedRoleUser('technician', { tokens: ['t1'] });
    await seedRoleUser('customer', { tokens: ['c1'] });
    const stats = await getPushStats();
    expect(stats.deviceHolders).toBe(2);
    expect(stats.broadcastRole).toBeNull();
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
