import { defineConfig } from '@playwright/test';
import { loadBackendEnv, useE2eDatabase, DEFAULT_API_DB } from './testDatabase.js';

loadBackendEnv();
// Never backend/.env's MONGODB_URI — see testDatabase.js.
const E2E_DB = useE2eDatabase(DEFAULT_API_DB);

// Covers the real, running backend HTTP surface (not in-process supertest like
// backend/tests/*) — per-phase gate: this suite must be fully green before a
// phase is committed as a checkpoint. `testDir: './api'` today (only backend
// endpoints exist); a `./ui` project gets added once the frontend is wired to
// real APIs (roadmap Phase 13).
const PORT = 4100;

export default defineConfig({
  testDir: './api',
  globalSetup: './global-setup.js',
  globalTeardown: './global-teardown.js',
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
      MONGODB_URI: E2E_DB,
      JWT_ACCESS_SECRET: 'e2e-access-secret',
      JWT_REFRESH_SECRET: 'e2e-refresh-secret',
      // 'test' provider captures codes in-memory instead of console.log, readable
      // back via GET /_dev/last-otp/:identifier (only mounted under NODE_ENV=test).
      OTP_PROVIDER: 'test',
      // Keep a developer's real .env credentials out of the test server — the
      // suite must not upload to their Cloudinary or send real push/WhatsApp.
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
      FCM_SERVICE_ACCOUNT_JSON: '',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_WHATSAPP_FROM: '',
      TWILIO_VOICE_NUMBER: '',
    },
  },
});
