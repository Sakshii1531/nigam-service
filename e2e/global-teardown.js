import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertSafeTestDb } from './testDatabase.js';

export default function globalTeardown() {
  const e2eDir = fileURLToPath(new URL('.', import.meta.url));

  // The suite's config set MONGODB_URI to the e2e database. This used to fall
  // back to backend/.env's MONGODB_URI — the developer's real database — and
  // purge test fixtures from it.
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('[e2e global teardown] No e2e MONGODB_URI resolved, skipping cleanup');
    return;
  }
  assertSafeTestDb(mongoUri);

  console.log('[e2e global teardown] Purging test fixtures from database...');
  const result = spawnSync('node', ['../backend/scripts/cleanupTestData.mjs', '--apply'], {
    cwd: e2eDir,
    env: { ...process.env, MONGODB_URI: mongoUri },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('[e2e global teardown] cleanupTestData failed with exit status', result.status);
  }
}

