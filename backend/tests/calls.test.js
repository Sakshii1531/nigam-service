/**
 * calls.test.js
 *
 * Tests the Twilio Click-to-Call relay module:
 *   1. initiateCall — creates a CallLog with status 'initiated' when Twilio responds OK
 *   2. initiateCall — throws 403 when caller is not a participant of the service request
 *   3. initiateCall — throws 503 when TWILIO_VOICE_NUMBER is not configured
 *   4. initiateCall — throws 422 when customer has no registered phone
 *   5. handleStatusCallback — updates CallLog status/duration on 'completed'
 *   6. handleStatusCallback — updates CallLog status on 'no-answer'
 *   7. getCallLogs — returns formatted call history for a participant
 *   8. getCallLogs — throws 403 for a non-participant
 *
 * The twilio SDK is mocked — no real network calls are made.
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { testDbUri } from './helpers/testDb.js';

// ── Mock twilio ───────────────────────────────────────────────────────────────
const mockCallsCreate = jest.fn();
jest.unstable_mockModule('twilio', () => ({
  default: jest.fn(() => ({
    calls: { create: mockCallsCreate },
  })),
}));

// ── Import modules AFTER mocks ────────────────────────────────────────────────
const { initiateCall, handleStatusCallback, getCallLogs } = await import(
  '../src/modules/calls/call.service.js'
);
const { CallLog } = await import('../src/modules/calls/callLog.model.js');
const { ServiceRequest } = await import('../src/modules/service-requests/serviceRequest.model.js');
const { User } = await import('../src/modules/auth/user.model.js');
const { ServiceProvider } = await import('../src/modules/service-provider/serviceProvider.model.js');

// ── DB setup ──────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await mongoose.connect(testDbUri('calls'));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await CallLog.deleteMany({});
  await ServiceRequest.deleteMany({});
  await User.deleteMany({});
  await ServiceProvider.deleteMany({});
  mockCallsCreate.mockReset();

  // Set up Twilio Voice env vars for each test
  process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
  process.env.TWILIO_AUTH_TOKEN = 'testtoken';
  process.env.TWILIO_VOICE_NUMBER = '+14085551234';
  process.env.CALL_MASKING_ENABLED = 'true';
});

afterEach(() => {
  delete process.env.TWILIO_VOICE_NUMBER;
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

async function makeFixtures() {
  const customerUser = await User.create({
    role: 'customer',
    name: 'Test Customer',
    phone: '9876543210',
    passwordHash: 'hash',
  });

  const serviceProviderUser = await User.create({
    role: 'service_provider',
    name: 'Test Tech',
    phone: '9000000001',
    passwordHash: 'hash',
  });

  const serviceProvider = await ServiceProvider.create({
    user: serviceProviderUser._id,
    name: 'Test Tech',
    phone: '9000000001',
    status: 'Active',
    availability: 'Available',
    specs: ['AC'],
  });

  const sr = await ServiceRequest.create({
    user: customerUser._id,
    serviceProvider: serviceProvider._id,
    category: 'AC',
    description: 'Test SR',
    requestMode: 'B2C',
    status: 'Assigned',
    timeline: [{ stepLabel: 'New', done: true, timestamp: new Date() }],
  });

  return { customerUser, serviceProviderUser, serviceProvider, sr };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('initiateCall', () => {
  test('creates a CallLog with status initiated when Twilio responds OK', async () => {
    const { customerUser, sr } = await makeFixtures();
    mockCallsCreate.mockResolvedValue({ sid: 'CA_test_sid_001' });

    const result = await initiateCall(
      { id: String(customerUser._id), role: 'customer' },
      String(sr._id),
    );

    expect(result.status).toBe('initiated');
    expect(result.initiatedBy).toBe('customer');
    expect(result.serviceRequest).toBeDefined();
    // Real phone numbers must NEVER appear as named fields in the response
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('customerPhone');
    expect(result).not.toHaveProperty('serviceProviderPhone');
    expect(result).not.toHaveProperty('customer');
    expect(result).not.toHaveProperty('serviceProvider');

    // Verify CallLog was persisted
    const log = await CallLog.findOne({ callSid: 'CA_test_sid_001' });
    expect(log).not.toBeNull();
    expect(log.status).toBe('initiated');
  });

  test('throws 403 when caller is not a participant of the service request', async () => {
    const { sr } = await makeFixtures();

    const stranger = await User.create({
      role: 'customer',
      name: 'Stranger',
      phone: '9111111111',
      passwordHash: 'hash',
    });

    await expect(
      initiateCall({ id: String(stranger._id), role: 'customer' }, String(sr._id)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 503 when TWILIO_VOICE_NUMBER is not set', async () => {
    delete process.env.TWILIO_VOICE_NUMBER;
    const { customerUser, sr } = await makeFixtures();

    await expect(
      initiateCall({ id: String(customerUser._id), role: 'customer' }, String(sr._id)),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  test('throws 422 when customer has no registered phone', async () => {
    const { customerUser, sr } = await makeFixtures();
    // Strip the phone field
    await User.findByIdAndUpdate(customerUser._id, { $unset: { phone: 1 } });
    mockCallsCreate.mockResolvedValue({ sid: 'CA_nophone' });

    await expect(
      initiateCall({ id: String(customerUser._id), role: 'customer' }, String(sr._id)),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  test('serviceProvider can initiate the call too', async () => {
    const { serviceProviderUser, sr } = await makeFixtures();
    mockCallsCreate.mockResolvedValue({ sid: 'CA_service_provider_init' });

    const result = await initiateCall(
      { id: String(serviceProviderUser._id), role: 'service_provider' },
      String(sr._id),
    );

    expect(result.status).toBe('initiated');
    expect(result.initiatedBy).toBe('service_provider');
  });
});

describe('handleStatusCallback', () => {
  test('updates CallLog to completed with duration', async () => {
    const { customerUser, serviceProvider, sr } = await makeFixtures();

    const log = await CallLog.create({
      callSid: 'CA_webhook_test',
      serviceRequest: sr._id,
      customer: customerUser._id,
      serviceProvider: serviceProvider._id,
      initiatedBy: 'customer',
      status: 'in-progress',
    });

    await handleStatusCallback({
      CallSid: 'CA_webhook_test',
      CallStatus: 'completed',
      CallDuration: '45',
    });

    const updated = await CallLog.findById(log._id);
    expect(updated.status).toBe('completed');
    expect(updated.duration).toBe(45);
    expect(updated.endedAt).toBeDefined();
  });

  test('updates CallLog to no-answer', async () => {
    const { customerUser, serviceProvider, sr } = await makeFixtures();

    await CallLog.create({
      callSid: 'CA_noanswer',
      serviceRequest: sr._id,
      customer: customerUser._id,
      serviceProvider: serviceProvider._id,
      initiatedBy: 'customer',
      status: 'ringing',
    });

    await handleStatusCallback({ CallSid: 'CA_noanswer', CallStatus: 'no-answer' });

    const updated = await CallLog.findOne({ callSid: 'CA_noanswer' });
    expect(updated.status).toBe('no-answer');
    expect(updated.endedAt).toBeDefined();
  });
});

describe('getCallLogs', () => {
  test('returns call history for the customer participant', async () => {
    const { customerUser, serviceProvider, sr } = await makeFixtures();

    await CallLog.create({
      callSid: 'CA_history_01',
      serviceRequest: sr._id,
      customer: customerUser._id,
      serviceProvider: serviceProvider._id,
      initiatedBy: 'customer',
      status: 'completed',
      duration: 60,
    });

    const logs = await getCallLogs(
      { id: String(customerUser._id), role: 'customer' },
      String(sr._id),
    );

    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('completed');
    expect(logs[0].duration).toBe(60);
    // Real phone numbers must NEVER appear as named fields in the response
    expect(logs[0]).not.toHaveProperty('phone');
    expect(logs[0]).not.toHaveProperty('customerPhone');
    expect(logs[0]).not.toHaveProperty('serviceProviderPhone');
    expect(logs[0]).not.toHaveProperty('customer');
    expect(logs[0]).not.toHaveProperty('serviceProvider');
  });

  test('throws 403 for a non-participant', async () => {
    const { sr } = await makeFixtures();

    const stranger = await User.create({
      role: 'customer',
      name: 'Stranger',
      phone: '9222222222',
      passwordHash: 'hash',
    });

    await expect(
      getCallLogs({ id: String(stranger._id), role: 'customer' }, String(sr._id)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
