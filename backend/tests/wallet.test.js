import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { WalletLedger } from '../src/modules/payments-wallet/walletLedger.model.js';
import { redeemCoins, creditCoins, getBalance, listClaimKeys } from '../src/modules/payments-wallet/wallet.service.js';
import { ROLES } from '../src/config/constants.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('wallet');

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), WalletLedger.deleteMany({})]);
});

async function createUser(walletCoins) {
  const user = await User.create({
    role: ROLES.CUSTOMER,
    phone: `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`,
    name: 'Wallet Test User',
    passwordHash: await hashPassword('password123'),
    walletCoins,
  });
  return user;
}

describe('redeemCoins', () => {
  it('debits the balance and writes a ledger entry', async () => {
    const user = await createUser(500);
    const entry = await redeemCoins(user.id, 200, { reason: 'redeemed' });

    expect(entry.delta).toBe(-200);
    expect(entry.balanceAfter).toBe(300);
    expect(await getBalance(user.id)).toBe(300);
  });

  it('rejects redemption exceeding the balance with no partial debit', async () => {
    const user = await createUser(100);
    await expect(redeemCoins(user.id, 200)).rejects.toThrow(/Insufficient wallet balance/);
    expect(await getBalance(user.id)).toBe(100);
  });

  it('rejects a non-positive amount', async () => {
    const user = await createUser(100);
    await expect(redeemCoins(user.id, 0)).rejects.toThrow(/must be positive/);
    await expect(redeemCoins(user.id, -10)).rejects.toThrow(/must be positive/);
  });

  it('stays consistent under concurrent requests that together exceed the balance', async () => {
    // 500 coins, five concurrent requests for 150 each (750 total requested) —
    // only 3 can possibly succeed (450 debited), the other 2 must fail cleanly,
    // and the final balance must reflect exactly the successful ones. This is
    // what atomic single-document findOneAndUpdate($gte guard) buys without a
    // multi-document transaction (see order.service.js's doc comment).
    const user = await createUser(500);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => redeemCoins(user.id, 150, { reason: 'redeemed' })),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(succeeded).toHaveLength(3);
    expect(failed).toHaveLength(2);
    failed.forEach((r) => expect(r.reason.message).toMatch(/Insufficient wallet balance/));

    const finalBalance = await getBalance(user.id);
    expect(finalBalance).toBe(500 - 3 * 150); // 50
    expect(finalBalance).toBeGreaterThanOrEqual(0);

    // Ledger has exactly one entry per successful debit, and they sum to the actual delta.
    const ledgerEntries = await WalletLedger.find({ user: user._id });
    expect(ledgerEntries).toHaveLength(3);
    expect(ledgerEntries.reduce((sum, e) => sum + e.delta, 0)).toBe(-450);
  });
});

describe('creditCoins', () => {
  it('credits the balance and writes a ledger entry', async () => {
    const user = await createUser(100);
    const entry = await creditCoins(user.id, 50, { reason: 'earned' });
    expect(entry.balanceAfter).toBe(150);
    expect(await getBalance(user.id)).toBe(150);
  });

  it('stays consistent under concurrent credits (no lost updates)', async () => {
    const user = await createUser(0);
    await Promise.all(Array.from({ length: 10 }, () => creditCoins(user.id, 10, { reason: 'earned' })));
    expect(await getBalance(user.id)).toBe(100);
  });
});

describe('one-time reward claims', () => {
  it('credits the first claim and rejects a repeat with 409, leaving the balance alone', async () => {
    const user = await createUser(0);

    await creditCoins(user._id, 50, { reason: 'earned', claimKey: 'book_service' });
    expect(await getBalance(user._id)).toBe(50);

    await expect(creditCoins(user._id, 50, { reason: 'earned', claimKey: 'book_service' })).rejects.toMatchObject({
      statusCode: 409,
    });
    // The guard runs before the $inc, so no coins leaked out on the failed attempt.
    expect(await getBalance(user._id)).toBe(50);
    expect(await WalletLedger.countDocuments({ user: user._id, claimKey: 'book_service' })).toBe(1);
  });

  it('keeps claims separate per key and per user', async () => {
    const alice = await createUser(0);
    const bob = await createUser(0);

    await creditCoins(alice._id, 50, { claimKey: 'book_service' });
    await creditCoins(alice._id, 20, { claimKey: 'write_review' });
    // Bob's claim of the same task is his own.
    await creditCoins(bob._id, 50, { claimKey: 'book_service' });

    expect((await listClaimKeys(alice._id)).sort()).toEqual(['book_service', 'write_review']);
    expect(await listClaimKeys(bob._id)).toEqual(['book_service']);
  });

  it('leaves ordinary credits unrestricted — only keyed claims are once-per-user', async () => {
    const user = await createUser(0);
    await creditCoins(user._id, 10, { reason: 'earned' });
    await creditCoins(user._id, 10, { reason: 'earned' });
    expect(await getBalance(user._id)).toBe(20);
    expect(await listClaimKeys(user._id)).toEqual([]);
  });
});
