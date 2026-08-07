import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Conversation } from '../src/modules/chat/conversation.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Message } from '../src/modules/chat/message.model.js';
import { getOrCreateConversation } from '../src/modules/chat/conversation.service.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('chat');

let app;
let phoneCounter = 9950000000;
function nextPhone() {
  return String(phoneCounter++);
}

function tokenFor(user, brand = null) {
  return signAccessToken({ sub: user.id, role: user.role, brand, permissions: [] });
}

async function createSuperAdmin() {
  const user = await User.create({
    role: ROLES.SUPER_ADMIN,
    email: `sa-${nextPhone()}@test.local`,
    name: 'Platform Admin',
    passwordHash: await hashPassword('x'),
  });
  return { user, token: tokenFor(user) };
}

async function createBrandAdmin(name) {
  const brand = await Brand.create({ name, category: 'Appliances', status: 'Active' });
  const user = await User.create({
    role: ROLES.BRAND_ADMIN,
    email: `${name.replace(/\s+/g, '-').toLowerCase()}-${nextPhone()}@test.local`,
    name: `${name} Admin`,
    brand: brand._id,
    passwordHash: await hashPassword('x'),
  });
  return { brand, user, token: tokenFor(user, String(brand._id)) };
}

async function createCustomer(phone = nextPhone()) {
  const user = await User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('x') });
  return { user, token: tokenFor(user) };
}

async function createTechnician(phone = nextPhone()) {
  const user = await User.create({ role: ROLES.TECHNICIAN, phone, name: 'Test Technician', passwordHash: await hashPassword('x') });
  const technician = await Technician.create({ user: user._id, name: 'Test Technician', phone, status: 'Active', availability: 'Available', specs: ['AC'] });
  return { user, technician, token: tokenFor(user) };
}

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp().listen(0);
});

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Technician.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({}), Brand.deleteMany({})]);
});

describe('getOrCreateConversation', () => {
  it('is idempotent for the same serviceRequest', async () => {
    const customer = await createCustomer();
    const tech = await createTechnician();
    const serviceRequestId = new mongoose.Types.ObjectId();

    const first = await getOrCreateConversation({ serviceRequest: serviceRequestId, customer: customer.user._id, technician: tech.technician._id });
    const second = await getOrCreateConversation({ serviceRequest: serviceRequestId, customer: customer.user._id, technician: tech.technician._id });

    expect(String(first.id)).toBe(String(second.id));
    expect(await Conversation.countDocuments({})).toBe(1);
  });

  it('masks both participants\' phone numbers in the assembled response', async () => {
    const customer = await createCustomer('9955512345');
    const tech = await createTechnician('9955567890');

    const conversation = await getOrCreateConversation({
      serviceRequest: new mongoose.Types.ObjectId(),
      customer: customer.user._id,
      technician: tech.technician._id,
    });

    expect(conversation.customer.phone).not.toBe('9955512345');
    expect(conversation.customer.phone).toMatch(/^\d{2}\*+\d{2}$/);
    expect(conversation.technician.phone).not.toBe('9955567890');
  });
});

describe('GET /chat/conversations', () => {
  it('scopes to the requesting customer or technician, not both', async () => {
    const customer = await createCustomer();
    const tech = await createTechnician();
    const otherCustomer = await createCustomer();

    await getOrCreateConversation({ serviceRequest: new mongoose.Types.ObjectId(), customer: customer.user._id, technician: tech.technician._id });

    const listAsCustomer = await request(app).get('/api/v1/chat/conversations').set('Authorization', `Bearer ${customer.token}`).expect(200);
    expect(listAsCustomer.body.data).toHaveLength(1);

    const listAsTech = await request(app).get('/api/v1/chat/conversations').set('Authorization', `Bearer ${tech.token}`).expect(200);
    expect(listAsTech.body.data).toHaveLength(1);

    const listAsOther = await request(app).get('/api/v1/chat/conversations').set('Authorization', `Bearer ${otherCustomer.token}`).expect(200);
    expect(listAsOther.body.data).toHaveLength(0);
  });
});

describe('GET /chat/conversations/:id and /messages', () => {
  it('rejects a non-participant, and returns message history for a participant', async () => {
    const customer = await createCustomer();
    const tech = await createTechnician();
    const intruder = await createCustomer();

    const conversation = await getOrCreateConversation({
      serviceRequest: new mongoose.Types.ObjectId(),
      customer: customer.user._id,
      technician: tech.technician._id,
    });
    await Message.create({ conversation: conversation.id, sender: 'technician', text: 'Hi there', status: 'sent' });

    const conversationId = String(conversation.id);
    await request(app).get(`/api/v1/chat/conversations/${conversationId}`).set('Authorization', `Bearer ${intruder.token}`).expect(403);
    await request(app).get(`/api/v1/chat/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${intruder.token}`).expect(403);

    const getRes = await request(app).get(`/api/v1/chat/conversations/${conversationId}`).set('Authorization', `Bearer ${customer.token}`).expect(200);
    expect(getRes.body.data.id).toBe(conversationId);

    const messagesRes = await request(app)
      .get(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tech.token}`)
      .expect(200);
    expect(messagesRes.body.data).toHaveLength(1);
    expect(messagesRes.body.data[0].text).toBe('Hi there');
  });
});

describe('brand support conversations', () => {
  it('opens a support thread with a customer and reuses it on a second call', async () => {
    const { token, brand } = await createBrandAdmin('Chat Brand A');
    const { user: customer } = await createCustomer();

    const first = await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: customer.id })
      .expect(201);

    expect(first.body.data.kind).toBe('support');
    expect(String(first.body.data.brand)).toBe(String(brand._id));
    // Support threads have no technician — they must not collapse into a job chat.
    expect(first.body.data.technician).toBeNull();

    const second = await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: customer.id })
      .expect(201);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await Conversation.countDocuments()).toBe(1);
  });

  it('keeps a support thread separate from the same customer\'s job chat', async () => {
    const { token } = await createBrandAdmin('Chat Brand B');
    const { user: customer } = await createCustomer();
    const { technician } = await createTechnician();

    await getOrCreateConversation({ customer: customer._id, technician: technician._id });
    await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: customer.id })
      .expect(201);

    expect(await Conversation.countDocuments()).toBe(2);
  });

  it('lists only this brand\'s threads, never another brand\'s', async () => {
    const a = await createBrandAdmin('Chat Brand C');
    const b = await createBrandAdmin('Chat Brand D');
    const { user: customer } = await createCustomer();

    await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ customerId: customer.id })
      .expect(201);

    const aList = await request(app)
      .get('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(aList.body.data).toHaveLength(1);

    const bList = await request(app)
      .get('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${b.token}`)
      .expect(200);
    expect(bList.body.data).toHaveLength(0);
  });

  it('refuses to read another brand\'s thread directly', async () => {
    const a = await createBrandAdmin('Chat Brand E');
    const b = await createBrandAdmin('Chat Brand F');
    const { user: customer } = await createCustomer();

    const opened = await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ customerId: customer.id })
      .expect(201);

    await request(app)
      .get(`/api/v1/chat/conversations/${opened.body.data.id}`)
      .set('Authorization', `Bearer ${b.token}`)
      .expect(403);
  });

  it('rejects opening a thread with a non-customer, and without a brand', async () => {
    const a = await createBrandAdmin('Chat Brand G');
    const { user: techUser } = await createTechnician();

    await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ customerId: techUser.id })
      .expect(400);

    const { token: customerToken } = await createCustomer();
    await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ customerId: techUser.id })
      .expect(403);
  });
});

describe('platform support desk', () => {
  it('opens one running thread per user rather than a ticket per query', async () => {
    const { user, token } = await createCustomer();

    const first = await request(app)
      .post('/api/v1/chat/conversations/support')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(first.body.data.kind).toBe('platform-support');

    const second = await request(app)
      .post('/api/v1/chat/conversations/support')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await Conversation.countDocuments({ customer: user._id, platformSupport: true })).toBe(1);
  });

  it('shows super-admin the help-desk queue and nothing else', async () => {
    const { token: adminToken } = await createSuperAdmin();
    const { token: customerToken } = await createCustomer();
    const { user: otherCustomer } = await createCustomer();
    const { technician } = await createTechnician();
    const { token: brandToken } = await createBrandAdmin('Support Brand A');

    await request(app).post('/api/v1/chat/conversations/support').set('Authorization', `Bearer ${customerToken}`).expect(201);
    // A job chat and a brand thread must stay private to their participants.
    await getOrCreateConversation({ customer: otherCustomer._id, technician: technician._id });
    await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ customerId: otherCustomer.id })
      .expect(201);

    const res = await request(app)
      .get('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].kind).toBe('platform-support');
  });

  it('refuses super-admin direct access to a job chat', async () => {
    const { token: adminToken } = await createSuperAdmin();
    const { user: customer } = await createCustomer();
    const { technician } = await createTechnician();

    const job = await getOrCreateConversation({ customer: customer._id, technician: technician._id });

    await request(app)
      .get(`/api/v1/chat/conversations/${job.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('keeps a support thread separate from the same customer\'s brand thread', async () => {
    const { user: customer, token: customerToken } = await createCustomer();
    const { token: brandToken } = await createBrandAdmin('Support Brand B');

    await request(app).post('/api/v1/chat/conversations/support').set('Authorization', `Bearer ${customerToken}`).expect(201);
    await request(app)
      .post('/api/v1/chat/conversations/brand')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ customerId: customer.id })
      .expect(201);

    expect(await Conversation.countDocuments({ customer: customer._id })).toBe(2);
  });
});
