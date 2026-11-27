import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { WalletLedger } from '../src/modules/payments-wallet/walletLedger.model.js';
import { SpinWheelConfig } from '../src/modules/rewards-loyalty/spinWheelConfig.model.js';
import { RewardsProgram, DEFAULT_LEVELS, DEFAULT_TASKS } from '../src/modules/rewards-loyalty/rewardsProgram.model.js';
import { awardForSpend } from '../src/modules/rewards-loyalty/rewards.service.js';
import { ROLES } from '../src/config/constants.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

// The Rewards Program end to end: the super admin configures earning, levels,
// tasks and the spin wheel in one place; the customer's Play Zone, spins,
// task claims and coins for spending all follow it, checked by the server.

const TEST_DB_URI = testDbUri('spinwheel');
let app;
let customer;
let token;
let adminToken;
const api = () => request(app);
const asCustomer = (r) => r.set('Authorization', `Bearer ${token}`);
const asAdmin = (r) => r.set('Authorization', `Bearer ${adminToken}`);

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = await listenOnLoopback(createApp());
});

afterAll(async () => {
  await closeServer(app);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), WalletLedger.deleteMany({}), SpinWheelConfig.deleteMany({}), RewardsProgram.deleteMany({}), Booking.deleteMany({})]);
  customer = await User.create({ role: ROLES.CUSTOMER, phone: '9876543210', name: 'Customer User', passwordHash: await hashPassword('password123'), walletCoins: 100 });
  token = (await api().post('/api/v1/auth/login').send({ role: 'customer', identifier: '9876543210', password: 'password123' }).expect(200)).body.data.accessToken;
  await User.create({ role: ROLES.SUPER_ADMIN, name: 'Admin', email: 'rewards-admin@test.local', passwordHash: await hashPassword('password123'), status: 'Active' });
  await api().post('/api/v1/auth/login').send({ role: 'super_admin', identifier: 'rewards-admin@test.local', password: 'password123' }).expect(200);
  adminToken = (await api().post('/api/v1/auth/otp/verify').send({ role: 'super_admin', identifier: 'rewards-admin@test.local', code: readOtpCode('rewards-admin@test.local') }).expect(200)).body.data.accessToken;
});

/** The default programme with these changes, saved by the admin. */
async function saveProgram(changes = {}, status = 200) {
  const { program } = (await asAdmin(api().get('/api/v1/super-admin/loyalty/program'), 200)).body.data;
  const body = {
    isActive: program.isActive,
    earning: program.earning,
    levels: program.levels,
    tasks: program.tasks,
    partnerBadges: program.partnerBadges,
    spinWheel: { isActive: program.spinWheel.isActive, xpPerSpin: program.spinWheel.xpPerSpin, segments: program.spinWheel.segments },
    ...changes,
  };
  return asAdmin(api().put('/api/v1/super-admin/loyalty/program').send(body)).expect(status);
}

const onePrize = (prize) => ({ isActive: true, xpPerSpin: 10, segments: [{ ...prize, probability: 100 }, { label: 'Try Again', prizeType: 'none', value: 0, probability: 0 }] });

describe('Rewards Program — admin', () => {
  it('starts with default levels, tasks and a wheel, and carries an old wheel over', async () => {
    await SpinWheelConfig.create({ segments: [{ label: '₹20 Cashback', probability: 60, winningType: 'money', value: 20 }, { label: 'Spin again', probability: 40, winningType: 'spin', value: 1 }] });
    const { program, stats } = (await asAdmin(api().get('/api/v1/super-admin/loyalty/program')).expect(200)).body.data;
    expect(program.levels.map((l) => l.name)).toEqual(DEFAULT_LEVELS.map((l) => l.name));
    expect(program.tasks.map((t) => t.key)).toEqual(DEFAULT_TASKS.map((t) => t.key));
    expect(program.spinWheel.segments).toEqual([
      expect.objectContaining({ label: '₹20 Cashback', prizeType: 'coins', value: 20, probability: 60 }),
      expect.objectContaining({ label: 'Spin again', prizeType: 'spin', value: 1, probability: 40 }),
    ]);
    expect(stats.customersPerLevel[0]).toEqual({ name: 'Bronze', customers: 1 });
  });

  it('refuses odds that do not add up to 100, levels that do not start at 0, and prizes without a value', async () => {
    const wheel = { isActive: true, xpPerSpin: 10, segments: [{ label: 'A', prizeType: 'coins', value: 5, probability: 60 }, { label: 'B', prizeType: 'none', value: 0, probability: 30 }] };
    expect((await saveProgram({ spinWheel: wheel }, 400)).body.error.message).toMatch(/add up to exactly 100% \(now 90%\)/);
    expect((await saveProgram({ levels: [{ name: 'Only', xpRequired: 50, dailySpins: 1, perks: '' }] }, 400)).body.error.message).toMatch(/first level must start at 0/);
    const noValue = { ...wheel, segments: [{ label: 'Coins!', prizeType: 'coins', value: 0, probability: 70 }, wheel.segments[1]] };
    expect((await saveProgram({ spinWheel: noValue }, 400)).body.error.message).toMatch(/"Coins!" needs a value/);
    await asCustomer(api().get('/api/v1/super-admin/loyalty/program')).expect(403);
  });

  it('moving level thresholds puts customers on the level their XP now reaches', async () => {
    await User.updateOne({ _id: customer._id }, { xp: 600 });
    await saveProgram({ levels: [{ name: 'Starter', xpRequired: 0, dailySpins: 1, perks: '' }, { name: 'Pro', xpRequired: 300, dailySpins: 4, perks: 'Four spins a day' }] }, 200);
    expect((await User.findById(customer._id)).level).toBe(2);
    const wallet = (await asCustomer(api().get('/api/v1/wallet')).expect(200)).body.data;
    expect(wallet).toMatchObject({ coins: 100, level: 2, spins: 4, levelInfo: { name: 'Pro', perks: 'Four spins a day', next: null } });
  });
});

describe('Rewards Program — spin wheel', () => {
  it('daily spins follow the level, a won spin adds one, and the next day starts again', async () => {
    await saveProgram({ spinWheel: onePrize({ label: '15 Coins', prizeType: 'coins', value: 15 }) }, 200);
    const first = (await asCustomer(api().post('/api/v1/wallet/spin-wheel/spin')).expect(200)).body.data;
    expect(first).toMatchObject({ winIndex: 0, prize: { label: '15 Coins', prizeType: 'coins', value: 15 }, coinsWon: 15, coins: 115, xp: 10, spinsLeft: 0 });
    expect((await asCustomer(api().post('/api/v1/wallet/spin-wheel/spin')).expect(400)).body.error.message).toMatch(/No spins left today/);
    expect(await WalletLedger.findOne({ user: customer._id, reason: 'spin_wheel' })).toMatchObject({ delta: 15 });

    // Tomorrow: Bronze's one daily spin again; this time the prize is an extra spin.
    await User.updateOne({ _id: customer._id }, { spinDay: '2000-01-01' });
    await saveProgram({ spinWheel: onePrize({ label: 'Extra Spin', prizeType: 'spin', value: 1 }) }, 200);
    const extra = (await asCustomer(api().post('/api/v1/wallet/spin-wheel/spin')).expect(200)).body.data;
    expect(extra).toMatchObject({ prize: { prizeType: 'spin' }, coinsWon: 0, spinsLeft: 1 });
    await saveProgram({ spinWheel: onePrize({ label: '5 Coins', prizeType: 'coins', value: 5 }) }, 200);
    await asCustomer(api().post('/api/v1/wallet/spin-wheel/spin')).expect(200);
    await asCustomer(api().post('/api/v1/wallet/spin-wheel/spin')).expect(400);
  });

  it('two spins at once cannot use the same last spin', async () => {
    await saveProgram({ spinWheel: onePrize({ label: '5 Coins', prizeType: 'coins', value: 5 }) }, 200);
    const results = await Promise.all([1, 2, 3].map(() => asCustomer(api().post('/api/v1/wallet/spin-wheel/spin'))));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await User.findById(customer._id)).walletCoins).toBe(105);
  });

  it('a switched-off wheel shows no segments and cannot be spun; the odds are never sent to customers', async () => {
    const shown = (await api().get('/api/v1/wallet/spin-wheel/config').expect(200)).body.data;
    expect(shown.segments.length).toBeGreaterThan(1);
    expect(shown.segments[0].probability).toBeUndefined();
    const { program } = (await asAdmin(api().get('/api/v1/super-admin/loyalty/program'))).body.data;
    await saveProgram({ spinWheel: { ...program.spinWheel, isActive: false } }, 200);
    expect((await api().get('/api/v1/wallet/spin-wheel/config').expect(200)).body.data).toEqual({ isActive: false, segments: [] });
    await asCustomer(api().post('/api/v1/wallet/spin-wheel/spin')).expect(400);
  });
});

describe('Rewards Program — tasks and spending', () => {
  it('a task pays only once it is really done, the admin-set amount, once', async () => {
    await asCustomer(api().post('/api/v1/wallet/credit').send({ amount: 100000 })).expect(404);
    await asCustomer(api().post('/api/v1/wallet/tasks/book_service/claim')).expect(400);
    await Booking.collection.insertOne({ user: customer._id, status: 'Completed', category: 'AC' });
    const rewards = (await asCustomer(api().post('/api/v1/wallet/tasks/book_service/claim')).expect(200)).body.data;
    expect(rewards.coins).toBe(150);
    expect(rewards.tasks.find((t) => t.key === 'book_service')).toMatchObject({ done: true, claimed: true, coins: 50 });
    await asCustomer(api().post('/api/v1/wallet/tasks/book_service/claim')).expect(409);
  });

  it('a paid service earns coins and XP per Rs.100, once per booking, and can level the customer up', async () => {
    await saveProgram({ earning: { coinsPer100: 5, xpPer100: 50 } }, 200);
    await awardForSpend(customer._id, 1199, { key: 'spend:booking-1' });
    await awardForSpend(customer._id, 1199, { key: 'spend:booking-1' });
    const user = await User.findById(customer._id);
    expect(user).toMatchObject({ walletCoins: 159, xp: 599, level: 2 });
    const rewards = (await asCustomer(api().get('/api/v1/wallet/rewards')).expect(200)).body.data;
    expect(rewards.level).toMatchObject({ number: 2, name: 'Silver', next: { name: 'Gold', xpRequired: 1500 } });
    expect(rewards.spinsLeft).toBe(2);
  });
});

describe('Rewards Program — partner badges', () => {
  it('the admin names the badges and their job ranges; a partner sees the badge their completed jobs reach', async () => {
    const { ServiceProvider } = await import('../src/modules/service-provider/serviceProvider.model.js');
    await ServiceProvider.deleteMany({});
    const spUser = await User.create({ role: ROLES.SERVICE_PROVIDER, phone: '9811100001', name: 'Badge Partner', passwordHash: await hashPassword('password123') });
    await ServiceProvider.create({ user: spUser._id, name: 'Badge Partner', phone: '9811100001', status: 'Active', completedJobsCount: 150 });

    expect((await saveProgram({ partnerBadges: [{ name: 'Rookie', minJobs: 5, color: '' }] }, 400)).body.error.message).toMatch(/must start at 0/);
    expect((await saveProgram({ partnerBadges: [{ name: 'A', minJobs: 0, color: '' }, { name: 'B', minJobs: 0, color: '' }] }, 400)).body.error.message).toMatch(/Two partner badges start at 0/);
    const saved = await saveProgram({
      partnerBadges: [
        { name: 'Starter', minJobs: 0, color: '#64748B' },
        { name: 'Pro Fixer', minJobs: 100, color: '#CA8A04' },
        { name: 'Master', minJobs: 500, color: '#0D47A1' },
      ],
    });
    expect(saved.body.data.stats.partnersPerBadge).toEqual([{ name: 'Starter', partners: 0 }, { name: 'Pro Fixer', partners: 1 }, { name: 'Master', partners: 0 }]);

    const spToken = (await api().post('/api/v1/auth/login').send({ role: 'service_provider', identifier: '9811100001', password: 'password123' }).expect(200)).body.data.accessToken;
    const profile = (await api().get('/api/v1/service-provider/profile/profile').set('Authorization', `Bearer ${spToken}`).expect(200)).body.data;
    expect(profile.badge).toMatchObject({ name: 'Pro Fixer', completedJobs: 150, next: { name: 'Master', minJobs: 500, jobsToGo: 350 } });
    expect(profile.badges.map((b) => b.name)).toEqual(['Starter', 'Pro Fixer', 'Master']);
  });
});
