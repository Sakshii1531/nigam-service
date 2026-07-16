import { defineConfig } from '@playwright/test';

// Covers the real, running backend HTTP surface (not in-process supertest like
// backend/tests/*) — per-phase gate: this suite must be fully green before a
// phase is committed as a checkpoint. `testDir: './api'` today (only backend
// endpoints exist); a `./ui` project gets added once the frontend is wired to
// real APIs (roadmap Phase 13).
const PORT = 4100;

export default defineConfig({
  testDir: './api',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    command: 'node ../backend/src/server.js',
    url: `http://127.0.0.1:${PORT}/api/v1/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      NODE_ENV: 'test',
      PORT: String(PORT),
      MONGODB_URI: 'mongodb://127.0.0.1:27017/nigam_care_e2e',
      JWT_ACCESS_SECRET: 'e2e-access-secret',
      JWT_REFRESH_SECRET: 'e2e-refresh-secret',
      // 'test' provider captures codes in-memory instead of console.log, readable
      // back via GET /_dev/last-otp/:identifier (only mounted under NODE_ENV=test).
      OTP_PROVIDER: 'test',
    },
  },
});
