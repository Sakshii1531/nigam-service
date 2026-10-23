import { defineConfig } from '@playwright/test';
// UI regressions use mocked API responses: no database, gateway or real uploads.
export default defineConfig({
  testDir: './ui',
  testMatch: ['ticketWorkspace.spec.js', 'documentPreview.spec.js', 'partnerWarrantyBrands.spec.js', 'notificationNavigation.spec.js'],
  reporter: 'list',
  timeout: 30000,
  use: { baseURL: 'http://localhost:5299', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite dev --port 5299 --strictPort', cwd: '../frontend',
    url: 'http://localhost:5299', reuseExistingServer: false,
    env: { VITE_API_BASE_URL: 'http://localhost:4111/api/v1' },
  },
});
