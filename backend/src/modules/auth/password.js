import bcrypt from 'bcryptjs';

// bcryptjs is a pure-JS implementation, so each op burns the event loop rather
// than a native thread: at 10 rounds a hash costs ~110ms and a compare ~100ms.
// A single login pays that three times (OTP hash + password compare + code
// compare), and the suite seeds hundreds of users — enough for tests to breach
// Jest's timeout, at which point Jest abandons the test and moves on while its
// async chain is still running, and the next test's beforeEach wipes the data
// underneath it. That surfaced as unrelated 400/404s in random tests.
//
// Cost is a security parameter only for real credentials, so it stays at 10
// everywhere except automated test runs. Read from process.env directly rather
// than config/env.js, which snapshots at import time.
const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
