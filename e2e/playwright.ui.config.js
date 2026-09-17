import { defineConfig } from '@playwright/test';
import { loadBackendEnv, useE2eDatabase, DEFAULT_UI_DB } from './testDatabase.js';

loadBackendEnv();
// Never backend/.env's MONGODB_URI — see testDatabase.js.
const E2E_DB = useE2eDatabase(DEFAULT_UI_DB);

// Browser-level smoke suite, separate from the api/ gate in playwright.config.js
// so the fast API run stays the per-phase checkpoint. Run with `npm run test:ui`.
//
// Uses its own ports and its own database: the frontend's API origin is passed
// in rather than read from frontend/.env, so a developer pointing their local
// .env at a deployed backend does not silently change what this tests.
const API_PORT = 4111;
const UI_PORT = 5199;
const API_ORIGIN = `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: './ui',
  globalSetup: './global-setup-ui.js',
  globalTeardown: './global-teardown.js',
  reporter: [['list']],
  timeout: 45_000,
  fullyParallel: false,
  use: { baseURL: `http://localhost:${UI_PORT}` },
  webServer: [
    {
      command: 'node ../backend/src/server.js',
      command: 'node src/server.js',
      cwd: '../backend',
      url: `${API_ORIGIN}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        MONGODB_URI: E2E_DB,
        JWT_ACCESS_SECRET: 'ui-access-secret',
        JWT_REFRESH_SECRET: 'ui-refresh-secret',
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
        CORS_ORIGINS: `http://localhost:${UI_PORT}`,
      },
    },
    {
      // Dev server rather than `preview` so the suite can never run against a
      // stale dist/ that predates the change being tested.
      command: `npx vite dev --port ${UI_PORT} --strictPort`,
      cwd: '../frontend',
      url: `http://localhost:${UI_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_API_BASE_URL: `${API_ORIGIN}/api/v1` },
    },
  ],
});
