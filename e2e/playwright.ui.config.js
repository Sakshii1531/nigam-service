import { defineConfig } from '@playwright/test';

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
  reporter: [['list']],
  timeout: 45_000,
  fullyParallel: false,
  use: { baseURL: `http://localhost:${UI_PORT}` },
  webServer: [
    {
      command: 'node ../backend/src/server.js',
      url: `${API_ORIGIN}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        MONGODB_URI: 'mongodb://127.0.0.1:27017/nigam_care_e2e_ui',
        JWT_ACCESS_SECRET: 'ui-access-secret',
        JWT_REFRESH_SECRET: 'ui-refresh-secret',
        OTP_PROVIDER: 'test',
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
