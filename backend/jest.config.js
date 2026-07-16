/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  clearMocks: true,
  // Default (5000ms) is tight for beforeAll hooks that open a fresh Mongoose
  // connection + await every model's index build — under --runInBand with the
  // suite now at 20+ files, connection setup has intermittently exceeded that
  // window purely from local mongod contention, not a real hang (the same
  // hooks always succeed well under 20s in isolation or on a clean run). This
  // is a Phase 10 hardening fix for that specific, repeatedly-observed flake
  // class — a genuine deadlock/bug still fails, just with realistic headroom.
  testTimeout: 20000,
};
