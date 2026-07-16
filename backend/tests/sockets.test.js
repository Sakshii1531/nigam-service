import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import http from 'node:http';
import mongoose from 'mongoose';
import { io as ioClient } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSockets } from '../src/sockets/index.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Conversation } from '../src/modules/chat/conversation.model.js';
import { Message } from '../src/modules/chat/message.model.js';
import { Job } from '../src/modules/technician/job.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { LiveTracking } from '../src/modules/super-admin/liveTracking.model.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
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

async function createTechnician() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.TECHNICIAN, phone, name: 'Test Technician', passwordHash: await hashPassword('x') });
  const technician = await Technician.create({ user: user._id, name: 'Test Technician', phone, status: 'Active', availability: 'Available', specs: ['AC'] });
  return { user, technician, token: tokenFor(user) };
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
    Technician.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
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
    const techA = await createTechnician();
    const conversationA = await Conversation.create({ customer: customerA.user._id, technician: techA.technician._id, status: 'Open' });

    const customerB = await createCustomer();
    const techB = await createTechnician();
    const conversationB = await Conversation.create({ customer: customerB.user._id, technician: techB.technician._id, status: 'Open' });

    const socketCustomerA = await connectClient(customerA.token);
    const socketTechA = await connectClient(techA.token);
    const socketCustomerB = await connectClient(customerB.token); // in conversation B, must never see A's message

    const joinA1 = await emitAck(socketCustomerA, 'join-conversation', { conversationId: conversationA.id });
    const joinA2 = await emitAck(socketTechA, 'join-conversation', { conversationId: conversationA.id });
    const joinB = await emitAck(socketCustomerB, 'join-conversation', { conversationId: conversationB.id });
    expect(joinA1.ok).toBe(true);
    expect(joinA2.ok).toBe(true);
    expect(joinB.ok).toBe(true);

    const receivedByA = waitForEvent(socketCustomerA, 'message:new');
    const receivedByB = waitForEvent(socketCustomerB, 'message:new');

    const sendResult = await emitAck(socketTechA, 'send-message', { conversationId: conversationA.id, text: 'Hello from tech A' });
    expect(sendResult.ok).toBe(true);
    expect(sendResult.message.text).toBe('Hello from tech A');
    expect(sendResult.message.sender).toBe('technician');

    const [msgA, msgB] = await Promise.all([receivedByA, receivedByB]);
    expect(msgA).not.toBeNull();
    expect(msgA.text).toBe('Hello from tech A');
    expect(msgB).toBeNull(); // conversation B's client received nothing — the isolation guarantee

    const persisted = await Message.findOne({ conversation: conversationA.id });
    expect(persisted.text).toBe('Hello from tech A');
    expect(await Message.countDocuments({ conversation: conversationB.id })).toBe(0);

    [socketCustomerA, socketTechA, socketCustomerB].forEach((s) => s.disconnect());
  });

  it('rejects join-conversation from someone who is not a participant', async () => {
    const owner = await createCustomer();
    const tech = await createTechnician();
    const conversation = await Conversation.create({ customer: owner.user._id, technician: tech.technician._id, status: 'Open' });

    const intruder = await createCustomer();
    const socket = await connectClient(intruder.token);

    const ack = await emitAck(socket, 'join-conversation', { conversationId: conversation.id });
    expect(ack.ok).toBe(false);

    socket.disconnect();
  });

  it('rejects send-message for a conversation never joined (or not a participant of)', async () => {
    const owner = await createCustomer();
    const tech = await createTechnician();
    const conversation = await Conversation.create({ customer: owner.user._id, technician: tech.technician._id, status: 'Open' });

    const intruder = await createCustomer();
    const socket = await connectClient(intruder.token);

    const ack = await emitAck(socket, 'send-message', { conversationId: conversation.id, text: 'sneaky' });
    expect(ack.ok).toBe(false);
    expect(await Message.countDocuments({ conversation: conversation.id })).toBe(0);

    socket.disconnect();
  });
});

describe('live tracking', () => {
  it('lets a technician update their own job location, delivered only to sockets that joined the tracking room', async () => {
    const customer = await createCustomer();
    const tech = await createTechnician();
    const superAdmin = await createSuperAdmin();
    const outsider = await createCustomer(); // never joins tracking room

    const sr = await ServiceRequest.create({ user: customer.user._id, technician: tech.technician._id, category: 'AC', status: 'Assigned', timeline: [] });
    const job = await Job.create({ serviceRequest: sr._id, technician: tech.technician._id, type: 'NCC Paid Service', isD2C: true, activeStep: 'ontheway' });

    const socketSA = await connectClient(superAdmin.token);
    const socketTech = await connectClient(tech.token);
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

  it('rejects a technician updating a job that is not theirs', async () => {
    const customer = await createCustomer();
    const owner = await createTechnician();
    const intruder = await createTechnician();

    const sr = await ServiceRequest.create({ user: customer.user._id, technician: owner.technician._id, category: 'AC', status: 'Assigned', timeline: [] });
    const job = await Job.create({ serviceRequest: sr._id, technician: owner.technician._id, type: 'NCC Paid Service', isD2C: true, activeStep: 'ontheway' });

    const socket = await connectClient(intruder.token);
    const ack = await emitAck(socket, 'update-location', { jobId: job.id, status: 'On the way' });
    expect(ack.ok).toBe(false);

    socket.disconnect();
  });
});
