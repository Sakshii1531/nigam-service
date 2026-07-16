import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Conversation } from '../src/modules/chat/conversation.model.js';
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

function tokenFor(user) {
  return signAccessToken({ sub: user.id, role: user.role, brand: null, permissions: [] });
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
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Technician.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
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
