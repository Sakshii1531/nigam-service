import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertSafeTestDb, DEFAULT_UI_DB } from './testDatabase.js';

export default function globalSetupUi() {
  const e2eDir = fileURLToPath(new URL('.', import.meta.url));
  const mongoUri = process.env.MONGODB_URI || DEFAULT_UI_DB;
  assertSafeTestDb(mongoUri);
  // Start from a clean catalogue so seed changes (rates, offerings) always
  // reach this suite — the seeder never rewrites a rate that already exists.
  // Safe: assertSafeTestDb above guarantees this is a local test database.
  const reset = spawnSync('node', ['../backend/scripts/resetCatalogueData.js', '--yes'], {
    cwd: e2eDir,
    env: { ...process.env, MONGODB_URI: mongoUri },
    stdio: 'inherit',
  });
  if (reset.status !== 0) {
    throw new Error('e2e UI global setup: resetCatalogueData.js failed');
  }
  const result = spawnSync('node', ['../backend/scripts/seed.js'], {
    cwd: e2eDir,
    env: { ...process.env, MONGODB_URI: mongoUri },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('e2e UI global setup: seed.js failed');
  }
}

