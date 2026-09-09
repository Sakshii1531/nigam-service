import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import http from 'node:http';
import mongoose from 'mongoose';
import { io as ioClient } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSockets } from '../src/sockets/index.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Conversation } from '../src/modules/chat/conversation.model.js';
import { Message } from '../src/modules/chat/message.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { LiveTracking } from '../src/modules/super-admin/liveTracking.model.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { sendAdHocPush } from '../src/modules/notifications/notification.service.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('sockets');

let httpServer;
let port;
let phoneCounter = 9800000000;
function nextPhone() {
  return String(phoneCounter++);
}

function tokenFor(user) {
  return signAccessToken({ sub: user.id, role: user.role, brand: user.brand ? user.brand.toString() : null, permissions: [] });
}

async function createCustomer() {
  const user = await User.create({ role: ROLES.CUSTOMER, phone: nextPhone(), name: 'Test Customer', passwordHash: await hashPassword('x') });
  return { user, token: tokenFor(user) };
}

async function createServiceProvider() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.SERVICE_PROVIDER, phone, name: 'Test Service Provider', passwordHash: await hashPassword('x') });
  const serviceProvider = await ServiceProvider.create({ user: user._id, name: 'Test Service Provider', phone, status: 'Active', availability: 'Available', specs: ['AC'] });
  return { user, serviceProvider, token: tokenFor(user) };
}

async function createBrandAdmin(name) {
  const brand = await Brand.create({ name, category: 'Appliances', status: 'Active' });
  const user = await User.create({
    role: ROLES.BRAND_ADMIN,
    email: `ba-${nextPhone()}@test.local`,
    name: `${name} Admin`,
    brand: brand._id,
    passwordHash: await hashPassword('x'),
  });
  return { brand, user, token: tokenFor(user) };
}

async function createSuperAdmin() {
  const user = await User.create({ role: ROLES.SUPER_ADMIN, email: `sa-${nextPhone()}@test.local`, name: 'SA', passwordHash: await hashPassword('x') });
  return { user, token: tokenFor(user) };
}

function connectClient(token) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, { auth: { token }, transports: ['websocket'], forceNew: true });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function waitForEvent(socket, event, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();

  const app = createApp();
  httpServer = http.createServer(app);
  initSockets(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    ServiceProvider.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Brand.deleteMany({}),
    Job.deleteMany({}),
    ServiceRequest.deleteMany({}),
    LiveTracking.deleteMany({}),
  ]);
});

describe('socket auth', () => {
  it('rejects a connection with no token', async () => {
    await expect(connectClient(undefined)).rejects.toThrow();
  });

  it('rejects a connection with a garbage token', async () => {
    await expect(connectClient('not-a-real-jwt')).rejects.toThrow();
  });

  it('accepts a connection with a valid access token', async () => {
    const { token } = await createCustomer();
    const socket = await connectClient(token);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });
});

describe('chat — the Phase 9 exit criterion: two clients exchange a message scoped to one conversation and it never leaks into another', () => {
  it('delivers a message only to sockets that joined that conversation\'s room', async () => {
    const customerA = await createCustomer();
    const serviceProviderA = await createServiceProvider();
    const conversationA = await Conversation.create({ customer: customerA.user._id, serviceProvider: serviceProviderA.serviceProvider._id, status: 'Open' });

    const customerB = await createCustomer();
    const serviceProviderB = await createServiceProvider();
    const conversationB = await Conversation.create({ customer: customerB.user._id, serviceProvider: serviceProviderB.serviceProvider._id, status: 'Open' });

    const socketCustomerA = await connectClient(customerA.token);
    const socketTechA = await connectClient(serviceProviderA.token);
    const socketCustomerB = await connectClient(customerB.token); // in conversation B, must never see A's message

    const joinA1 = await emitAck(socketCustomerA, 'join-conversation', { conversationId: conversationA.id });
    const joinA2 = await emitAck(socketTechA, 'join-conversation', { conversationId: conversationA.id });
    const joinB = await emitAck(socketCustomerB, 'join-conversation', { conversationId: conversationB.id });
    expect(joinA1.ok).toBe(true);
    expect(joinA2.ok).toBe(true);
    expect(joinB.ok).toBe(true);

    const receivedByA = waitForEvent(socketCustomerA, 'message:new');
    const receivedByB = waitForEvent(socketCustomerB, 'message:new');

    const sendResult = await emitAck(socketTechA, 'send-message', { conversationId: conversationA.id, text: 'Hello from provider A' });
    expect(sendResult.ok).toBe(true);
    expect(sendResult.message.text).toBe('Hello from provider A');
    expect(sendResult.message.sender).toBe('service_provider');

    const [msgA, msgB] = await Promise.all([receivedByA, receivedByB]);
    expect(msgA).not.toBeNull();
    expect(msgA.text).toBe('Hello from provider A');
    expect(msgB).toBeNull(); // conversation B's client received nothing — the isolation guarantee

    const persisted = await Message.findOne({ conversation: conversationA.id });
    expect(persisted.text).toBe('Hello from provider A');
    expect(await Message.countDocuments({ conversation: conversationB.id })).toBe(0);

    [socketCustomerA, socketTechA, socketCustomerB].forEach((s) => s.disconnect());
  });

  it('rejects join-conversation from someone who is not a participant', async () => {
    const owner = await createCustomer();
    const provider = await createServiceProvider();
    const conversation = await Conversation.create({ customer: owner.user._id, serviceProvider: provider.serviceProvider._id, status: 'Open' });

    const intruder = await createCustomer();
    const socket = await connectClient(intruder.token);

    const ack = await emitAck(socket, 'join-conversation', { conversationId: conversation.id });
    expect(ack.ok).toBe(false);

    socket.disconnect();
  });

  it('rejects send-message for a conversation never joined (or not a participant of)', async () => {
    const owner = await createCustomer();
    const provider = await createServiceProvider();
    const conversation = await Conversation.create({ customer: owner.user._id, serviceProvider: provider.serviceProvider._id, status: 'Open' });

    const intruder = await createCustomer();
    const socket = await connectClient(intruder.token);

    const ack = await emitAck(socket, 'send-message', { conversationId: conversation.id, text: 'sneaky' });
    expect(ack.ok).toBe(false);
    expect(await Message.countDocuments({ conversation: conversation.id })).toBe(0);

    socket.disconnect();
  });
});

describe('live tracking', () => {
  it('lets a serviceProvider update their own job location, delivered only to sockets that joined the tracking room', async () => {
    const customer = await createCustomer();
    const provider = await createServiceProvider();
    const superAdmin = await createSuperAdmin();
    const outsider = await createCustomer(); // never joins tracking room

    const sr = await ServiceRequest.create({ user: customer.user._id, serviceProvider: provider.serviceProvider._id, category: 'AC', status: 'Assigned', timeline: [] });
    const job = await Job.create({ serviceRequest: sr._id, serviceProvider: provider.serviceProvider._id, type: 'NCC Paid Service', isD2C: true, activeStep: 'ontheway' });

    const socketSA = await connectClient(superAdmin.token);
    const socketTech = await connectClient(provider.token);
    const socketOutsider = await connectClient(outsider.token);

    const joinAck = await emitAck(socketSA, 'join-tracking', {});
    expect(joinAck.ok).toBe(true);

    const receivedBySA = waitForEvent(socketSA, 'tracking:update');
    const receivedByOutsider = waitForEvent(socketOutsider, 'tracking:update');

    const updateAck = await emitAck(socketTech, 'update-location', {
      jobId: job.id,
      status: 'On the way',
      eta: '10 min',
      location: 'MG Road',
      coords: { lat: 1, lng: 2 },
    });
    expect(updateAck.ok).toBe(true);

    const [saUpdate, outsiderUpdate] = await Promise.all([receivedBySA, receivedByOutsider]);
    expect(saUpdate).not.toBeNull();
    expect(saUpdate.status).toBe('On the way');
    expect(outsiderUpdate).toBeNull();

    const persisted = await LiveTracking.findOne({ job: job.id });
    expect(persisted.location).toBe('MG Road');

    [socketSA, socketTech, socketOutsider].forEach((s) => s.disconnect());
  });

  it('rejects a non-super-admin trying to join the tracking room', async () => {
    const customer = await createCustomer();
    const socket = await connectClient(customer.token);
    const ack = await emitAck(socket, 'join-tracking', {});
    expect(ack.ok).toBe(false);
    socket.disconnect();
  });

  it('rejects a serviceProvider updating a job that is not theirs', async () => {
    const customer = await createCustomer();
    const owner = await createServiceProvider();
    const intruder = await createServiceProvider();

    const sr = await ServiceRequest.create({ user: customer.user._id, serviceProvider: owner.serviceProvider._id, category: 'AC', status: 'Assigned', timeline: [] });
    const job = await Job.create({ serviceRequest: sr._id, serviceProvider: owner.serviceProvider._id, type: 'NCC Paid Service', isD2C: true, activeStep: 'ontheway' });

    const socket = await connectClient(intruder.token);
    const ack = await emitAck(socket, 'update-location', { jobId: job.id, status: 'On the way' });
    expect(ack.ok).toBe(false);

    socket.disconnect();
  });
});

describe('chat — a brand support agent is a real participant', () => {
  it('lets a brand agent join its own support thread and exchange messages with the customer', async () => {
    const { brand, token: agentToken } = await createBrandAdmin('Socket Brand A');
    const { user: customer, token: customerToken } = await createCustomer();

    const conversation = await Conversation.create({ customer: customer._id, brand: brand._id, status: 'Open' });

    const agent = await connectClient(agentToken);
    const client = await connectClient(customerToken);

    expect(await emitAck(agent, 'join-conversation', { conversationId: conversation.id })).toEqual({ ok: true });
    expect(await emitAck(client, 'join-conversation', { conversationId: conversation.id })).toEqual({ ok: true });

    // The customer receives what the agent sends, attributed to 'agent'.
    const delivered = new Promise((resolve) => client.on('message:new', resolve));
    const ack = await emitAck(agent, 'send-message', { conversationId: conversation.id, text: 'How can we help?' });
    expect(ack.ok).toBe(true);
    expect(ack.message.sender).toBe('agent');

    const received = await delivered;
    expect(received.text).toBe('How can we help?');

    agent.disconnect();
    client.disconnect();
  });

  it('refuses a brand agent on another brand\'s thread', async () => {
    const a = await createBrandAdmin('Socket Brand B');
    const b = await createBrandAdmin('Socket Brand C');
    const { user: customer } = await createCustomer();

    const conversation = await Conversation.create({ customer: customer._id, brand: a.brand._id, status: 'Open' });

    const intruder = await connectClient(b.token);
    const joinRes = await emitAck(intruder, 'join-conversation', { conversationId: conversation.id });
    expect(joinRes.ok).toBe(false);

    // And cannot send even without joining.
    const sendRes = await emitAck(intruder, 'send-message', { conversationId: conversation.id, text: 'leak' });
    expect(sendRes.ok).toBe(false);
    expect(await Message.countDocuments()).toBe(0);

    intruder.disconnect();
  });

  it('refuses a brand agent on a job chat their brand is not part of', async () => {
    const { token } = await createBrandAdmin('Socket Brand D');
    const { user: customer } = await createCustomer();
    const { serviceProvider } = await createServiceProvider();

    // A customer<->service provider thread has no brand at all.
    const conversation = await Conversation.create({ customer: customer._id, serviceProvider: serviceProvider._id, status: 'Open' });

    const agent = await connectClient(token);
    const res = await emitAck(agent, 'join-conversation', { conversationId: conversation.id });
    expect(res.ok).toBe(false);

    agent.disconnect();
  });
});

describe('chat — the platform help desk', () => {
  it('lets super-admin answer a support thread, attributed to the desk', async () => {
    const { token: adminToken } = await createSuperAdmin();
    const { user: customer, token: customerToken } = await createCustomer();

    const conversation = await Conversation.create({ customer: customer._id, platformSupport: true, status: 'Open' });

    const admin = await connectClient(adminToken);
    const client = await connectClient(customerToken);

    expect(await emitAck(admin, 'join-conversation', { conversationId: conversation.id })).toEqual({ ok: true });
    expect(await emitAck(client, 'join-conversation', { conversationId: conversation.id })).toEqual({ ok: true });

    const delivered = new Promise((resolve) => client.on('message:new', resolve));
    const ack = await emitAck(admin, 'send-message', { conversationId: conversation.id, text: 'Looking into it now.' });
    expect(ack.ok).toBe(true);
    expect(ack.message.sender).toBe('agent');
    expect((await delivered).text).toBe('Looking into it now.');

    admin.disconnect();
    client.disconnect();
  });

  it('refuses super-admin on a job chat, and a brand agent on a support thread', async () => {
    const { token: adminToken } = await createSuperAdmin();
    const b = await createBrandAdmin('Desk Brand A');
    const { user: customer } = await createCustomer();
    const { serviceProvider } = await createServiceProvider();

    const jobChat = await Conversation.create({ customer: customer._id, serviceProvider: serviceProvider._id, status: 'Open' });
    const supportThread = await Conversation.create({ customer: customer._id, platformSupport: true, status: 'Open' });

    const admin = await connectClient(adminToken);
    // The help desk is not a back door into private job chats.
    expect((await emitAck(admin, 'join-conversation', { conversationId: jobChat.id })).ok).toBe(false);

    const brandAgent = await connectClient(b.token);
    // A brand desk is not the platform desk.
    expect((await emitAck(brandAgent, 'join-conversation', { conversationId: supportThread.id })).ok).toBe(false);

    admin.disconnect();
    brandAgent.disconnect();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast rooms — a role-targeted broadcast has to reach that role's live
// connections. Every socket used to join only 'broadcast:All', so the console's
// role-targeted broadcasts were emitted into rooms with no members at all.
// ─────────────────────────────────────────────────────────────────────────────
describe('broadcast rooms', () => {
  it('delivers a role-targeted broadcast to that role and nobody else', async () => {
    const { token: serviceProviderToken } = await createServiceProvider();
    const { token: custToken } = await createCustomer();

    const serviceProviderSocket = await connectClient(serviceProviderToken);
    const custSocket = await connectClient(custToken);

    const serviceProviderHeard = waitForEvent(serviceProviderSocket, 'notification:new');
    const custHeard = waitForEvent(custSocket, 'notification:new');

    await sendAdHocPush({ broadcastRole: 'ServiceProviders', title: 'Payout moved', body: 'Wednesdays', type: 'promo' });

    expect((await serviceProviderHeard)?.title).toBe('Payout moved');
    expect(await custHeard).toBeNull();

    serviceProviderSocket.disconnect();
    custSocket.disconnect();
  });

  it('delivers an "All" broadcast to every role', async () => {
    const { token: serviceProviderToken } = await createServiceProvider();
    const { token: custToken } = await createCustomer();

    const serviceProviderSocket = await connectClient(serviceProviderToken);
    const custSocket = await connectClient(custToken);

    const serviceProviderHeard = waitForEvent(serviceProviderSocket, 'notification:new');
    const custHeard = waitForEvent(custSocket, 'notification:new');

    await sendAdHocPush({ broadcastRole: 'All', title: 'Maintenance tonight', body: '2 AM', type: 'promo' });

    expect((await serviceProviderHeard)?.title).toBe('Maintenance tonight');
    expect((await custHeard)?.title).toBe('Maintenance tonight');

    serviceProviderSocket.disconnect();
    custSocket.disconnect();
  });

  it('routes a brand broadcast to brand admins only', async () => {
    const b = await createBrandAdmin('RoomTestBrand');
    const { token: serviceProviderToken } = await createServiceProvider();

    const brandSocket = await connectClient(b.token);
    const serviceProviderSocket = await connectClient(serviceProviderToken);

    const brandHeard = waitForEvent(brandSocket, 'notification:new');
    const serviceProviderHeard = waitForEvent(serviceProviderSocket, 'notification:new');

    await sendAdHocPush({ broadcastRole: 'Brands', title: 'Portal update', body: 'New report', type: 'promo' });

    expect((await brandHeard)?.title).toBe('Portal update');
    expect(await serviceProviderHeard).toBeNull();

    brandSocket.disconnect();
    serviceProviderSocket.disconnect();
  });
});
