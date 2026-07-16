import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { NotificationPreference } from '../src/modules/notifications/notificationPreference.model.js';
import { emit } from '../src/modules/notifications/notification.service.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('notifications');

let app;
let phoneCounter = 9900000000;
function nextPhone() {
  return String(phoneCounter++);
}

function tokenFor(user) {
  return signAccessToken({ sub: user.id, role: user.role, brand: null, permissions: [] });
}

async function createCustomer() {
  const user = await User.create({ role: ROLES.CUSTOMER, phone: nextPhone(), name: 'Test Customer', passwordHash: await hashPassword('x') });
  return { user, token: tokenFor(user) };
}

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Technician.deleteMany({}),
    Notification.deleteMany({}),
    NotificationPreference.deleteMany({}),
  ]);
});

describe('emit() — domain event -> Notification template', () => {
  it('creates a correctly-shaped Notification for each known event', async () => {
    const { user } = await createCustomer();

    const created = await emit('booking.created', { user: user.id, category: 'AC', bookingId: 'b1' });
    expect(created.type).toBe('created');
    expect(created.recipient.toString()).toBe(user.id);

    const assigned = await emit('technician.assigned', { user: user.id, technicianName: 'Rahul', serviceRequestId: 'sr1' });
    expect(assigned.type).toBe('assigned');
    expect(assigned.message).toMatch(/Rahul/);

    const payment = await emit('payment.success', { user: user.id, amount: 500 });
    expect(payment.type).toBe('payment');
    expect(payment.message).toMatch(/500/);

    const completed = await emit('service.completed', { user: user.id, serviceRequestId: 'sr1' });
    expect(completed.type).toBe('completed');

    const claim = await emit('claim.approved', { user: user.id, item: 'Fan Blade' });
    expect(claim.type).toBe('claims');
    expect(claim.message).toMatch(/Fan Blade/);

    const escalation = await emit('escalation.raised', { reason: 'SLA breach' });
    expect(escalation.type).toBe('dispatch');
    expect(escalation.broadcastRole).toBe('All');
    expect(escalation.recipient).toBeNull();
  });

  it('never throws on an unknown event — returns null instead', async () => {
    const result = await emit('not.a.real.event', {});
    expect(result).toBeNull();
  });
});

describe('GET /notifications — listing and the read=false/true filter', () => {
  it('lists both personally-addressed and broadcast notifications for a user', async () => {
    const { user, token } = await createCustomer();
    await emit('booking.created', { user: user.id, category: 'AC', bookingId: 'b1' });
    await emit('escalation.raised', { reason: 'x' });

    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('?read=false and ?read=true filter correctly — regression test for the string-coercion bug', async () => {
    const { user, token } = await createCustomer();
    const n1 = await emit('booking.created', { user: user.id, category: 'AC', bookingId: 'b1' });
    await emit('payment.success', { user: user.id, amount: 100 });

    await request(app).patch(`/api/v1/notifications/${n1.id}/read`).set('Authorization', `Bearer ${token}`).expect(200);

    const unreadRes = await request(app).get('/api/v1/notifications?read=false').set('Authorization', `Bearer ${token}`).expect(200);
    expect(unreadRes.body.data).toHaveLength(1);
    expect(unreadRes.body.data[0].read).toBe(false);

    const readRes = await request(app).get('/api/v1/notifications?read=true').set('Authorization', `Bearer ${token}`).expect(200);
    expect(readRes.body.data).toHaveLength(1);
    expect(readRes.body.data[0].read).toBe(true);
  });
});

describe('PATCH /notifications/:id/read and /read-all', () => {
  it('marks a personal notification read, and rejects another user\'s notification', async () => {
    const { user, token } = await createCustomer();
    const other = await createCustomer();

    const n = await emit('booking.created', { user: user.id, category: 'AC', bookingId: 'b1' });

    const res = await request(app).patch(`/api/v1/notifications/${n.id}/read`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.read).toBe(true);

    const n2 = await emit('booking.created', { user: user.id, category: 'AC', bookingId: 'b2' });
    await request(app).patch(`/api/v1/notifications/${n2.id}/read`).set('Authorization', `Bearer ${other.token}`).expect(403);
  });

  it('rejects marking a broadcast notification read via the per-user endpoint (no per-recipient read state)', async () => {
    const { token } = await createCustomer();
    const broadcast = await emit('escalation.raised', { reason: 'x' });
    await request(app).patch(`/api/v1/notifications/${broadcast.id}/read`).set('Authorization', `Bearer ${token}`).expect(400);
  });

  it('read-all marks only personal notifications read, leaving broadcasts untouched', async () => {
    const { user, token } = await createCustomer();
    await emit('booking.created', { user: user.id, category: 'AC', bookingId: 'b1' });
    await emit('payment.success', { user: user.id, amount: 100 });
    const broadcast = await emit('escalation.raised', { reason: 'x' });

    await request(app).patch('/api/v1/notifications/read-all').set('Authorization', `Bearer ${token}`).expect(200);

    const personal = await Notification.find({ recipient: user._id });
    expect(personal.every((n) => n.read)).toBe(true);

    const reloadedBroadcast = await Notification.findById(broadcast.id);
    expect(reloadedBroadcast.read).toBe(false);
  });
});

describe('notification preferences', () => {
  it('defaults to all-enabled and can be updated', async () => {
    const { token } = await createCustomer();

    const getRes = await request(app).get('/api/v1/notifications/preferences').set('Authorization', `Bearer ${token}`).expect(200);
    expect(getRes.body.data).toMatchObject({ push: true, sms: true, email: true });

    const putRes = await request(app)
      .put('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ sms: false })
      .expect(200);
    expect(putRes.body.data.sms).toBe(false);
    expect(putRes.body.data.push).toBe(true);
  });
});
