import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertSafeTestDb, DEFAULT_API_DB } from './testDatabase.js';

// Runs the real backend/scripts/seed.js (idempotent) against the e2e database
// before the suite starts, so catalog/booking specs have real categories,
// services, and a service provider to work with — same seed logic used for local dev,
// not a duplicated fixture. auth.spec.js doesn't depend on this (it creates its
// own users via /_dev/test-user) but benefits from the RBAC data too.
export default function globalSetup() {
  const e2eDir = fileURLToPath(new URL('.', import.meta.url));
  // playwright.config.js already resolved the e2e database into MONGODB_URI;
  // check it again here since this is the step that writes to it.
  const mongoUri = process.env.MONGODB_URI || DEFAULT_API_DB;
  assertSafeTestDb(mongoUri);
  const result = spawnSync('node', ['../backend/scripts/seed.js'], {
    cwd: e2eDir,
    env: { ...process.env, MONGODB_URI: mongoUri },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('e2e global setup: seed.js failed — see output above');
  }
}
