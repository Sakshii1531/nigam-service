import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { WalletLedger } from '../src/modules/payments-wallet/walletLedger.model.js';
import { SpinWheelConfig } from '../src/modules/rewards-loyalty/spinWheelConfig.model.js';
import { ROLES } from '../src/config/constants.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('spinwheel');

let app;
let testUser;
let token;

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
  await Promise.all([
    User.deleteMany({}),
    WalletLedger.deleteMany({}),
    SpinWheelConfig.deleteMany({})
  ]);

  // Create a customer user
  testUser = await User.create({
    role: ROLES.CUSTOMER,
    phone: '9876543210',
    name: 'Customer User',
    passwordHash: await hashPassword('password123'),
    walletCoins: 100,
    spinsLeft: 3
  });

  // Login to acquire token
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ role: 'customer', identifier: '9876543210', password: 'password123' });
  
  // Obtain OTP stub log code
  const verifyRes = await request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ role: 'customer', identifier: '9876543210', code: '123456' });
  
  token = verifyRes.body?.data?.accessToken;

  // Seed Spin Wheel Config with 2 segments
  await SpinWheelConfig.create({
    segments: [
      { label: '50 Coins', probability: 50, winningType: 'coins', value: 50 },
      { label: '1 SPIN', probability: 50, winningType: 'spin', value: 1 }
    ],
    isActive: true
  });
});

describe('Spin Wheel Secure Flow', () => {
  it('default spins is 3 and returns correctly in wallet view', async () => {
    const res = await request(app)
      .get('/api/v1/wallet')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.spins).toBe(3);
  });

  it('decrements spins and applies coins rewards on spinning', async () => {
    // Force a deterministic Math.random to land on index 0 (50 Coins)
    const originalRandom = Math.random;
    Math.random = () => 0.25; // 0.25 * 100 = 25, falls inside cumulative probability 50 (index 0)

    try {
      const res = await request(app)
        .post('/api/v1/wallet/spin-wheel/spin')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.winIndex).toBe(0);
      expect(res.body.data.wonSegment.winningType).toBe('coins');
      expect(res.body.data.wonSegment.value).toBe(50);
      expect(res.body.data.spinsLeft).toBe(2); // 3 -> 2
      expect(res.body.data.coins).toBe(150); // 100 -> 150

      // Ledger was created
      const ledger = await WalletLedger.findOne({ user: testUser._id });
      expect(ledger).toBeTruthy();
      expect(ledger.delta).toBe(50);
      expect(ledger.reason).toBe('spin_wheel');

    } finally {
      Math.random = originalRandom;
    }
  });

  it('exhausts spins and blocks subsequent attempts', async () => {
    // Exhaust all 3 spins
    await User.findByIdAndUpdate(testUser._id, { spinsLeft: 0 });

    const res = await request(app)
      .post('/api/v1/wallet/spin-wheel/spin')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/No spins left/i);
  });
});
